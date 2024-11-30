/* eslint-disable react/destructuring-assignment */
import { faAlignJustify } from "@fortawesome/free-solid-svg-icons/faAlignJustify";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ModifierArguments, Modifier, Padding } from "@popperjs/core";
import detectOverflow from "@popperjs/core/lib/utils/detectOverflow";
import React, {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useEffect,
  useState,
} from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import CopyToClipboardButton from "./CopyToClipboardButton";
import { removePunctuation } from "./PuzzleAnswer";
import { sortPuzzlesByRelevanceWithinPuzzleGroup } from "./RelatedPuzzleList";
import RelatedPuzzleTable from "./RelatedPuzzleTable";

const RemoveTagButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  height: 16px;
  width: 16px;
  line-height: 10px;
  font-size: 10px;
  padding: 0;
  margin: 0 0 0 6px;
`;

// Applying display:flex directly to popover-header leads to incorrect vertical sizing when the
// popover's height is constrained by the viewport. Use an inner div to avoid this.
const RelatedPuzzlePopoverHeaderInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const RelatedPuzzlePopoverControls = styled.div`
  align-self: start;
  margin-left: 8px;
  flex: 0 0 auto;

  > * {
    margin-left: 8px;
  }
`;

const StyledPopover = styled(Popover)`
  max-width: none;
  display: flex;
  flex-direction: column;

  .popover-body {
    overflow: auto;
  }
`;

const TagDiv = styled.div<{
  $popoverCapable: boolean;
  $popoverOpen: boolean;
  $isAdministrivia: boolean;
  $isMeta: boolean;
  $isGroup: boolean;
  $isMetaFor: boolean;
  $isNeeds: boolean;
  $isPriority: boolean;
  $isLocation?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  line-height: 24px;
  margin: 2px 4px 2px 0;
  padding: 0 6px;
  border-radius: 4px;
  background-color: #ddd;
  color: #000;
  ${({ $popoverCapable }) =>
    $popoverCapable &&
    css`
      cursor: default;
      position: relative;
    `}
  ${({ $popoverCapable, $popoverOpen }) =>
    $popoverCapable &&
    $popoverOpen &&
    css`
      &::after {
        content: "";
        display: block;
        position: absolute;
        top: 100%;
        left: 0%;
        width: 100%;
        height: 0.5rem; /* This was $popover-arrow-height which I'm hardcoding here */
        z-index: 2;
      }
    `}
  ${({ $isAdministrivia }) =>
    $isAdministrivia &&
    css`
      background-color: #ff7;
    `}
  ${({ $isMeta }) =>
    $isMeta &&
    css`
      background-color: #ffd57f;
    `}
  ${({ $isGroup }) =>
    $isGroup &&
    css`
      background-color: #7fffff;
    `}
  ${({ $isMetaFor }) =>
    $isMetaFor &&
    css`
      background-color: #ffb0b0;
    `}
  ${({ $isNeeds }) =>
    $isNeeds &&
    css`
      background-color: #ff4040;
    `}
  ${({ $isPriority }) =>
    $isPriority &&
    css`
      background-color: #aaf;
    `}
  ${({ $isLocation }) =>
    $isLocation &&
    css`
      background-color: #aaffc3;
    `}
`;

const TagLink = styled(Link)`
  &,
  &:active,
  &:focus,
  &:hover {
    color: #000;
    text-decoration: none;
  }
`;

const PopoverPadding = {
  top: 10,
  bottom: 10,
  left: 5,
  right: 5,
};

// Calculate the tag name to use when determining related puzzles
// There may be more cases here in the future
function getRelatedPuzzlesSharedTagName(name: string) {
  if (name.lastIndexOf("meta-for:", 0) === 0) {
    return `group:${name.slice("meta-for:".length)}`;
  }
  return name;
}

type PopperScreenFitOptions = { padding: Padding };

const PopperScreenFit: Modifier<"screenFit", PopperScreenFitOptions> = {
  name: "screenFit",
  enabled: true,
  phase: "beforeWrite",
  requiresIfExists: ["offset", "preventOverflow"],
  fn({ state, options }: ModifierArguments<PopperScreenFitOptions>) {
    // Default to using preventOverflow's options to enforce consistent padding
    const preventOverflowMod = state.orderedModifiers.find(
      (m) => m.name === "preventOverflow",
    );
    const padding =
      options.padding ?? preventOverflowMod?.options?.padding ?? {};
    const overflow = detectOverflow(state, { padding });
    const { height, width } = state.rects.popper;
    const placementEdge = state.placement.split("-")[0];
    // detectOverflow isn't aware of preventOverflow's shift, so overflow can appear on either side
    // Have to work in terms of max because narrowing width might result in increasing height
    let maxWidth;
    let maxHeight;
    if (placementEdge === "top" || placementEdge === "bottom") {
      maxWidth = width - overflow.right - overflow.left;
      maxHeight = height - overflow[placementEdge];
    } else if (placementEdge === "left" || placementEdge === "right") {
      maxHeight = height - overflow.top - overflow.bottom;
      maxWidth = width - overflow[placementEdge];
    } else {
      return;
    }
    state.styles.popper!.maxHeight = `${maxHeight}px`;
    state.styles.popper!.maxWidth = `${maxWidth}px`;
  },
};

interface BaseTagProps {
  tag: TagType;
  // if present, show a dismiss button
  onRemove?: (tagId: string) => void;
  linkToSearch: boolean;
}

interface DoNotPopoverRelatedProps {
  popoverRelated: false;
}

interface PopoverRelatedProps {
  popoverRelated: true;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
}

type TagProps = BaseTagProps & (DoNotPopoverRelatedProps | PopoverRelatedProps);

const Tag = (props: TagProps) => {
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [segmentAnswers, setSegmentAnswers] = useState<boolean>(false);

  const onOverlayTriggerToggle = useCallback((nextShow: boolean) => {
    setShowPopover(nextShow);
  }, []);

  const doShowPopover = useCallback(() => {
    setShowPopover(true);
  }, []);

  const doHidePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  const toggleSegmentAnswers = useCallback(() => {
    setSegmentAnswers(!segmentAnswers);
  }, [segmentAnswers]);

  useEffect(() => {
    // Necessary to ensure the popover closes when entering the iframe on
    // devices that don't support hover
    window.addEventListener("blur", doHidePopover);
    return () => {
      window.removeEventListener("blur", doHidePopover);
    };
  }, [doHidePopover]);

  const { onRemove, tag } = props;
  const onRemoveCb = useCallback(() => {
    if (onRemove) {
      onRemove(tag._id);
    }
  }, [onRemove, tag._id]);

  const allTagsIfPresent = props.popoverRelated ? props.allTags : undefined;
  const allPuzzlesIfPresent = props.popoverRelated
    ? props.allPuzzles
    : undefined;
  const getRelatedPuzzles = useCallback(() => {
    if (!props.popoverRelated) {
      return [];
    }
    const sharedTagName = getRelatedPuzzlesSharedTagName(props.tag.name);
    const sharedTag = allTagsIfPresent!.find((t) => t.name === sharedTagName);
    return sharedTag
      ? allPuzzlesIfPresent!.filter((p) => p.tags.includes(sharedTag._id))
      : [];
  }, [
    props.popoverRelated,
    props.tag.name,
    allTagsIfPresent,
    allPuzzlesIfPresent,
  ]);

  const relatedPuzzlesForClipboard = useCallback(() => {
    if (!props.popoverRelated) {
      return "";
    }
    const tagIndex = indexedById(allTagsIfPresent!);
    const sharedTagName = getRelatedPuzzlesSharedTagName(props.tag.name);
    const sharedTag = allTagsIfPresent!.find((t) => t.name === sharedTagName);
    const relatedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(
      getRelatedPuzzles(),
      sharedTag,
      tagIndex,
    );
    const clipboardData = relatedPuzzles
      .map((puzzle) => {
        const minRowCnt =
          puzzle.expectedAnswerCount >= 1 ? puzzle.expectedAnswerCount : 1;
        const missingCnt =
          minRowCnt > puzzle.answers.length
            ? minRowCnt - puzzle.answers.length
            : 0;
        const answers = puzzle.answers.concat(Array(missingCnt).fill(""));
        return answers
          .map((answer) => {
            const formattedAnswer = segmentAnswers
              ? removePunctuation(answer)
              : answer;
            return `${puzzle.title}\t${formattedAnswer}`;
          })
          .join("\n");
      })
      .join("\n");
    return clipboardData;
  }, [
    props.popoverRelated,
    props.tag.name,
    allTagsIfPresent,
    getRelatedPuzzles,
    segmentAnswers,
  ]);

  const name = props.tag.name;
  const isAdministrivia = name === "administrivia";
  const isMeta = name === "is:meta" || name === "is:metameta";
  const isGroup = name.lastIndexOf("group:", 0) === 0;
  const isMetaFor = name.lastIndexOf("meta-for:", 0) === 0;
  const isNeeds = name.lastIndexOf("needs:", 0) === 0;
  const isPriority = name.lastIndexOf("priority:", 0) === 0;
  const isLocation = name.lastIndexOf("location:", 0) === 0;

  // Browsers won't word-break on hyphens, so suggest
  // Use wbr instead of zero-width space to make copy-paste reasonable
  const nameWithBreaks: (string | React.JSX.Element)[] = [];
  name.split(":").forEach((part, i, arr) => {
    const withColon = i < arr.length - 1;
    nameWithBreaks.push(`${part}${withColon ? ":" : ""}`);
    if (withColon) {
      // eslint-disable-next-line react/no-array-index-key
      nameWithBreaks.push(<wbr key={`wbr-${i}-${part}`} />);
    }
  });
  let title;
  if (props.linkToSearch) {
    title = (
      <TagLink
        to={{
          pathname: `/hunts/${props.tag.hunt}/puzzles`,
          search: `q=${props.tag.name}`,
        }}
      >
        {nameWithBreaks}
      </TagLink>
    );
  } else {
    title = nameWithBreaks;
  }

  const tagElement = (
    <TagDiv
      $popoverCapable={props.popoverRelated}
      $popoverOpen={showPopover}
      $isAdministrivia={isAdministrivia}
      $isMeta={isMeta}
      $isGroup={isGroup}
      $isMetaFor={isMetaFor}
      $isNeeds={isNeeds}
      $isPriority={isPriority}
      $isLocation={isLocation}
    >
      {title}
      {props.onRemove && (
        <RemoveTagButton variant="danger" onClick={onRemoveCb}>
          <FontAwesomeIcon icon={faTimes} />
        </RemoveTagButton>
      )}
    </TagDiv>
  );

  if (props.popoverRelated) {
    const sharedTagName = getRelatedPuzzlesSharedTagName(props.tag.name);
    const relatedPuzzles = getRelatedPuzzles();
    const respaceButtonVariant = segmentAnswers
      ? "secondary"
      : "outline-secondary";
    const popover = (
      <StyledPopover
        id={`tag-${props.tag._id}`}
        onMouseEnter={doShowPopover}
        onMouseLeave={doHidePopover}
      >
        <Popover.Header>
          <RelatedPuzzlePopoverHeaderInner>
            {sharedTagName}
            <RelatedPuzzlePopoverControls>
              <Button
                variant={respaceButtonVariant}
                size="sm"
                onClick={toggleSegmentAnswers}
              >
                <FontAwesomeIcon icon={faAlignJustify} />
                {"    "}
                Respace
              </Button>
              <CopyToClipboardButton
                variant="secondary"
                size="sm"
                tooltipId={`copy-related-puzzles-${props.tag._id}`}
                text={relatedPuzzlesForClipboard}
              >
                <FontAwesomeIcon icon={faCopy} />
                {"    "}
                Copy
              </CopyToClipboardButton>
            </RelatedPuzzlePopoverControls>
          </RelatedPuzzlePopoverHeaderInner>
        </Popover.Header>
        <Popover.Body>
          <RelatedPuzzleTable
            relatedPuzzles={relatedPuzzles}
            allTags={props.allTags}
            sharedTag={props.tag}
            segmentAnswers={segmentAnswers}
          />
        </Popover.Body>
      </StyledPopover>
    );
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={popover}
        trigger={["hover", "click"]}
        onToggle={onOverlayTriggerToggle}
        show={showPopover}
        popperConfig={{
          modifiers: [
            { name: "preventOverflow", options: { padding: PopoverPadding } },
            PopperScreenFit,
          ],
        }}
      >
        {tagElement}
      </OverlayTrigger>
    );
  } else {
    return tagElement;
  }
};

export default Tag;
