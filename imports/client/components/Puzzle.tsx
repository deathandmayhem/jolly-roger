import { useTracker } from "meteor/react-meteor-data";
import { faEye } from "@fortawesome/free-regular-svg-icons/faEye";
import { faAngleDoubleUp } from "@fortawesome/free-solid-svg-icons/faAngleDoubleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faNoteSticky } from "@fortawesome/free-solid-svg-icons/faNoteSticky";
import { faPhone } from "@fortawesome/free-solid-svg-icons/faPhone";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { Link } from "react-router-dom";
import styled, { css, useTheme } from "styled-components";
import { difference, indexedById } from "../../lib/listUtils";
import MeteorUsers from "../../lib/models/MeteorUsers";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import type { Solvedness } from "../../lib/solvedness";
import { computeSolvedness } from "../../lib/solvedness";
import updatePuzzle from "../../methods/updatePuzzle";
import { useOperatorActionsHiddenForHunt } from "../hooks/persisted-state";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import indexedDisplayNames from "../indexedDisplayNames";
import type { Theme } from "../theme";
import AvatarStack from "./AvatarStack";
import BookmarkButton from "./BookmarkButton";
import PuzzleActivity from "./PuzzleActivity";
import PuzzleAnswer from "./PuzzleAnswer";
import PuzzleDeleteModal from "./PuzzleDeleteModal";
import type { PuzzleModalFormSubmitPayload } from "./PuzzleModalForm";
import PuzzleModalForm from "./PuzzleModalForm";
import { mediaBreakpointDown } from "./styling/responsive";
import TagList from "./TagList";

const NO_SUBSCRIBERS = {
  rtcViewers: [] as string[],
  activeViewers: [] as string[],
  passiveViewers: [] as string[],
};

const PuzzleDiv = styled.div<{
  $solvedness: Solvedness;
  theme: Theme;
}>`
  background-color: ${({ $solvedness, theme }) => {
    return theme.colors.solvedness[$solvedness];
  }};
  display: flex;
  flex-direction: row;
  align-items: first baseline;
  justify-content: flex-start;
  line-height: 24px;
  padding: 4px 2px;
  margin-bottom: 4px;
  transition: filter 0.1s ease-in-out;

  &:hover {
    filter: ${({ theme }) =>
      theme.basicMode === "dark" ? "brightness(1.2)" : "brightness(0.95)"};
  }
  ${mediaBreakpointDown(
    "xs",
    css`
      flex-wrap: wrap;
    `,
  )}
`;

const PuzzleNote = styled.span`
  align-items: center;
  justify-content: center;
  text-align: right;
  margin: 0 0 0 0.5rem;
`;

const PuzzleColumn = styled.div`
  padding: 0 2px;
  display: inline-block;
  flex: none;
  overflow: hidden;
`;

const PuzzleControlButtonsColumn = styled(PuzzleColumn)`
  align-self: flex-start;
  order: -1;
`;

const StyledButton: FC<ComponentPropsWithRef<typeof Button>> = styled(Button)`
  /* Precedence boost needed to override bootstrap default button padding */
  && {
    /* Resize button to fit in one line-height */
    display: block;
    height: 24px;
    width: 24px;
    padding: 0;
  }
`;

const PuzzleTitleColumn = styled(PuzzleColumn)`
  flex: 4;
  overflow-wrap: break-word;
  order: -1;
`;

const PuzzleActivityColumn = styled(PuzzleColumn)`
  width: 11rem;
  text-align: right;
  ${mediaBreakpointDown(
    "xs",
    css`
      /* Push to take whole row in narrow views */
      flex: 0 0 100%;
    `,
  )}
`;

const PuzzleLinkColumn = styled(PuzzleColumn)`
  width: 26px;
  text-align: center;
  ${mediaBreakpointDown(
    "xs",
    css`
      order: -1;
    `,
  )}
`;

const PuzzleAnswerColumn = styled(PuzzleColumn)`
  flex: 3;
  ${mediaBreakpointDown(
    "xs",
    css`
      /* Push to take whole row in narrow views */
      flex: 0 0 100%;
    `,
  )}
`;

const TagListColumn = styled(TagList)`
  padding: 0 2px;
  display: inline-block;
  flex: 3;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex: 0 0 100%;
    `,
  )}
`;

const PuzzleMetaColumn = styled(PuzzleColumn)`
  padding: 0 2px;
  display: inline-block;
  flex: 1.5;
  font-size: 1.1rem;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex: 0 0 100%;
    `,
  )}
`;

const PuzzlePriorityColumn = styled(PuzzleColumn)`
  padding: 0 2px;
  display: inline-block;
  flex: 1;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex: 0 0 100%;
    `,
  )}
`;

const SolversColumn = styled(PuzzleColumn)`
  padding: 0 2px;
  display: inline-block;
  flex: 3;
  margin: -2px -4px -2px 0;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex: 0 0 100%;
    `,
  )}
`;

const SolverRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  line-height: normal;
`;

const Puzzle = React.memo(
  ({
    puzzle,
    bookmarked,
    allTags,
    canUpdate,
    showSolvers,
    suppressTags,
    segmentAnswers,
    subscribers,
    puzzleUsers,
  }: {
    puzzle: PuzzleType;
    bookmarked: boolean;
    // All tags associated with the hunt.
    allTags: TagType[];
    canUpdate: boolean;
    showSolvers: "hide" | "viewers" | "active";
    suppressTags?: string[];
    segmentAnswers?: boolean;
    subscribers: Record<string, string[]> | null;
    puzzleUsers: string[];
  }) => {
    const puzzleId = puzzle._id;
    const huntId = puzzle.hunt;

    useSubscribeDisplayNames(huntId);

    indexedDisplayNames();
    const [operatorActionsHidden] = useOperatorActionsHiddenForHunt(
      puzzle.hunt,
    );

    const { rtcViewers, activeViewers, passiveViewers } =
      subscribers ?? NO_SUBSCRIBERS;

    const showEdit = canUpdate && !operatorActionsHidden;

    // Generating the edit modals for all puzzles is expensive, so we do it
    // lazily. The first time the modal button is clicked, we change this state
    // variable, which causes us to mount a new modal, which is set to open on
    // mount. Subsequent times, we just open the existing modal.
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const editModalRef = useRef<React.ElementRef<typeof PuzzleModalForm>>(null);
    const [renderDeleteModal, setRenderDeleteModal] = useState<boolean>(false);
    const deleteModalRef =
      useRef<React.ElementRef<typeof PuzzleDeleteModal>>(null);

    const onEdit = useCallback(
      (
        state: PuzzleModalFormSubmitPayload,
        callback: (error?: Error) => void,
      ) => {
        const { huntId: _huntId, docType: _docType, ...rest } = state;
        updatePuzzle.call({ puzzleId, ...rest }, callback);
      },
      [puzzleId],
    );

    const onShowEditModal = useCallback(() => {
      if (showEditModal && editModalRef.current) {
        editModalRef.current.show();
      } else {
        setShowEditModal(true);
      }
    }, [showEditModal]);
    const onShowDeleteModal = useCallback(() => {
      if (renderDeleteModal && deleteModalRef.current) {
        deleteModalRef.current.show();
      } else {
        setRenderDeleteModal(true);
      }
    }, [renderDeleteModal]);

    const theme = useTheme();

    const editButtons = useMemo(() => {
      if (showEdit) {
        return (
          <>
            <StyledButton
              onClick={onShowEditModal}
              variant={theme.basicMode}
              title="Edit puzzle..."
            >
              <FontAwesomeIcon icon={faEdit} />
            </StyledButton>
            {!puzzle.deleted && (
              <StyledButton
                onClick={onShowDeleteModal}
                variant={theme.basicMode}
                title="Delete puzzle..."
              >
                <FontAwesomeIcon icon={faMinus} />
              </StyledButton>
            )}
          </>
        );
      }
      return null;
    }, [
      showEdit,
      puzzle.deleted,
      onShowEditModal,
      onShowDeleteModal,
      theme.basicMode,
    ]);

    // id, title, answer, tags
    const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;
    const tagIndex = indexedById(allTags);

    const isMetameta = puzzle.tags.some(
      (tagId) => tagIndex.get(tagId)?.name === "is:metameta",
    );
    const isMeta =
      !isMetameta &&
      puzzle.tags.some(
        (tagId) =>
          tagIndex.get(tagId)?.name === "is:meta" ||
          tagIndex.get(tagId)?.name.startsWith("meta-for:"),
      );
    const isHighPriority = puzzle.tags.some(
      (tagId) => tagIndex.get(tagId)?.name === "priority:high",
    );
    const isLowPriority = puzzle.tags.some(
      (tagId) => tagIndex.get(tagId)?.name === "priority:low",
    );
    const isStuck = puzzle.tags.some(
      (tagId) =>
        tagIndex.get(tagId)?.name === "stuck" ||
        tagIndex.get(tagId)?.name === "is:stuck",
    );
    const statusEmoji = useTracker(() => {
      if (isHighPriority) {
        return <FontAwesomeIcon icon={faAngleDoubleUp} color="red" />;
      } else if (isLowPriority) {
        return <FontAwesomeIcon icon={faAngleDown} />;
      } else {
        return null;
      }
    }, [isHighPriority, isLowPriority]);

    const statusTooltipText = useTracker(() => {
      if (isHighPriority) {
        return "High priority";
      } else if (isLowPriority) {
        return "Low priority";
      } else {
        return null;
      }
    }, [isHighPriority, isLowPriority]);

    const statusTooltip = statusEmoji ? (
      <Tooltip id={`puzzle-status-tooltip-${puzzleId}`}>
        <span>{statusTooltipText}</span>
      </Tooltip>
    ) : null;

    // Now that we're putting those tags elsewhere, we're going to suppress them as well
    // but only the ones that are displayed
    const emojifiedTags: string[] = [];
    if (isMetameta) {
      emojifiedTags.push("is:metameta");
    } else if (isMeta) {
      emojifiedTags.push("is:meta");
    }

    if (isHighPriority) {
      emojifiedTags.push("priority:high");
    } else if (isLowPriority) {
      emojifiedTags.push("priority:low");
    }
    if (isStuck) {
      emojifiedTags.push("is:stuck", "stuck");
    }
    const extraSuppress = allTags
      .filter((t) => emojifiedTags.includes(t.name))
      .map((t) => t._id);

    const suppressedMetaTagNames = suppressTags
      ?.map((t) => tagIndex.get(t)?.name.replace(/^group:/, "meta-for:"))
      .filter((t) => t?.startsWith("meta-for:"));

    const suppressedMetaTags = allTags
      .filter((t) => suppressedMetaTagNames?.includes(t.name))
      .map((t) => t._id);

    const shownTags = difference(
      puzzle.tags,
      suppressTags?.concat(extraSuppress).concat(suppressedMetaTags) ?? [],
    );
    const ownTags = shownTags
      .map((tagId) => {
        return tagIndex.get(tagId);
      })
      .filter<TagType>((t): t is TagType => t !== undefined);

    const solvedness = computeSolvedness(puzzle);
    const answers = puzzle.answers.map((answer, i) => {
      return (
        <PuzzleAnswer
          key={`${i}-${answer}`}
          answer={answer}
          respace={segmentAnswers}
          breakable={!segmentAnswers}
          indented={!segmentAnswers}
        />
      );
    });

    const noteTooltip = useMemo(() => {
      if (!puzzle.noteContent) {
        return null;
      }
      const note = puzzle.noteContent;

      const truncate = (text: string, length: number) => {
        if (text.length <= length) return text;
        return text.substring(0, length) + "…";
      };

      const noteTT = [];
      if (note.flavor) {
        noteTT.push(
          <div key="flavor">
            <strong>Flavor: </strong> <em>{truncate(note.flavor, 250)}</em>
          </div>,
        );
      }
      if (note.summary) {
        noteTT.push(
          <div key="summary">
            <strong>Summary:</strong> {truncate(note.summary, 250)}
          </div>,
        );
      }
      if (note.theories) {
        noteTT.push(
          <div key="theories">
            <strong>Theories: </strong> <em>{truncate(note.theories, 250)}</em>
          </div>,
        );
      }

      if (noteTT.length === 0) {
        return null;
      }

      const noteTooltip = (props: ComponentPropsWithRef<typeof Tooltip>) => (
        <Tooltip
          id={`puzzle-pin-message-${puzzleId}`}
          {...props}
          style={{
            maxHeight: "9.55rem",
            borderRadius: "5px",
            pointerEvents: "none",
            ...props.style,
          }}
        >
          {noteTT}
        </Tooltip>
      );

      return noteTooltip;
    }, [puzzleId, puzzle.noteContent]);

    const puzzleIsMeta = useTracker(() => {
      if (isMetameta) {
        return (
          <Badge pill bg="warning" text="dark">
            <FontAwesomeIcon icon={faStar} />
            Metameta
          </Badge>
        );
      } else if (isMeta) {
        return (
          <Badge pill bg="warning" text="dark">
            <FontAwesomeIcon icon={faStar} />
            Meta
          </Badge>
        );
      } else {
        return null;
      }
    }, [isMeta, isMetameta]);

    const rtcUsers = useTracker(
      () =>
        rtcViewers
          .map((id) => MeteorUsers.findOne(id))
          .filter((u): u is Meteor.User => !!u),
      [rtcViewers],
    );
    const activeUsers = useTracker(
      () =>
        activeViewers
          .map((id) => MeteorUsers.findOne(id))
          .filter((u): u is Meteor.User => !!u),
      [activeViewers],
    );
    const passiveUsers = useTracker(
      () =>
        passiveViewers
          .map((id) => MeteorUsers.findOne(id))
          .filter((u): u is Meteor.User => !!u),
      [passiveViewers],
    );

    const allViewerUsers = useMemo(
      () => [
        ...activeUsers.map((u) => ({ ...u, isPassive: false })),
        ...passiveUsers.map((u) => ({ ...u, isPassive: true })),
      ],
      [activeUsers, passiveUsers],
    );

    const solversTooltip = useMemo(() => {
      const showRtc = rtcUsers.length > 0;
      const showActive = activeUsers.length > 0;
      const showPassive = passiveUsers.length > 0;

      if (!showRtc && !showActive && !showPassive) {
        return <div />;
      }

      return (
        <Tooltip id={`solvers-tooltip-${puzzleId}`}>
          {showRtc && (
            <div style={{ textAlign: "left" }}>
              <FontAwesomeIcon icon={faPhone} fixedWidth />{" "}
              {rtcUsers.map((u) => u.displayName).join(", ")}
            </div>
          )}
          {showActive && (
            <div style={{ textAlign: "left" }}>
              <FontAwesomeIcon icon={faEye} fixedWidth />{" "}
              {activeUsers.map((u) => u.displayName).join(", ")}
            </div>
          )}
          {showPassive && (
            <div
              style={{ textAlign: "left", fontStyle: "italic", opacity: 0.8 }}
            >
              {passiveUsers.map((u) => u.displayName).join(", ")}
            </div>
          )}
        </Tooltip>
      );
    }, [puzzleId, rtcUsers, activeUsers, passiveUsers]);
    return (
      <PuzzleDiv $solvedness={solvedness}>
        {showEditModal ? (
          <PuzzleModalForm
            key={puzzle._id}
            ref={editModalRef}
            puzzle={puzzle}
            huntId={puzzle.hunt}
            tags={allTags}
            onSubmit={onEdit}
            showOnMount
          />
        ) : null}
        {renderDeleteModal && (
          <PuzzleDeleteModal ref={deleteModalRef} puzzle={puzzle} />
        )}
        <PuzzleControlButtonsColumn>
          <ButtonGroup size="sm">
            <BookmarkButton
              puzzleId={puzzle._id}
              bookmarked={bookmarked}
              as={StyledButton}
              variant={theme.basicMode}
            />
            {showEdit && editButtons}
          </ButtonGroup>
        </PuzzleControlButtonsColumn>
        <PuzzleTitleColumn>
          <Link to={linkTarget}>{puzzle.title}</Link>
          {puzzle.noteContent && noteTooltip && (
            <OverlayTrigger placement="top" overlay={noteTooltip}>
              <PuzzleNote>
                <FontAwesomeIcon icon={faNoteSticky} />
              </PuzzleNote>
            </OverlayTrigger>
          )}
        </PuzzleTitleColumn>
        <PuzzlePriorityColumn>
          {statusEmoji && statusTooltip ? (
            <OverlayTrigger placement="top" overlay={statusTooltip}>
              <span>{statusEmoji}</span>
            </OverlayTrigger>
          ) : null}
          {isStuck ? (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`stuck-tt-${puzzleId}`}>Stuck</Tooltip>}
            >
              <span>🤷</span>
            </OverlayTrigger>
          ) : null}
        </PuzzlePriorityColumn>
        <PuzzleMetaColumn>{puzzleIsMeta}</PuzzleMetaColumn>
        <SolversColumn>
          {showSolvers !== "hide" && solvedness === "unsolved" ? (
            <OverlayTrigger placement="left" overlay={solversTooltip}>
              <div style={{ cursor: "default" }}>
                {rtcUsers.length > 0 && (
                  <SolverRow>
                    <FontAwesomeIcon icon={faPhone} fixedWidth />
                    <AvatarStack users={rtcUsers} tooltip={<div />} />
                  </SolverRow>
                )}
                {allViewerUsers.length > 0 && (
                  <SolverRow>
                    <FontAwesomeIcon icon={faEye} fixedWidth />
                    <AvatarStack users={allViewerUsers} tooltip={<div />} />
                  </SolverRow>
                )}
              </div>
            </OverlayTrigger>
          ) : null}
        </SolversColumn>
        <PuzzleActivityColumn>
          {solvedness === "unsolved" && (
            <PuzzleActivity
              huntId={puzzle.hunt}
              puzzleId={puzzle._id}
              unlockTime={puzzle.createdAt}
              subscribers={subscribers}
            />
          )}
        </PuzzleActivityColumn>
        <PuzzleLinkColumn>
          {puzzle.url ? (
            <span>
              <a
                href={puzzle.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open the puzzle"
                aria-label="Open the puzzle"
              >
                <FontAwesomeIcon icon={faPuzzlePiece} />
              </a>
            </span>
          ) : null}
        </PuzzleLinkColumn>
        <PuzzleAnswerColumn>{answers}</PuzzleAnswerColumn>
        <TagListColumn
          puzzle={puzzle}
          tags={ownTags}
          linkToSearch
          popoverRelated={false}
        />
      </PuzzleDiv>
    );
  },
);

export default Puzzle;
