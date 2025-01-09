import { Meteor } from "meteor/meteor";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, {
  type ComponentPropsWithRef,
  type FC,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/esm/ButtonGroup";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { difference, indexedById } from "../../lib/listUtils";
import type { PuzzleType } from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import type { Solvedness } from "../../lib/solvedness";
import { computeSolvedness } from "../../lib/solvedness";
import updatePuzzle from "../../methods/updatePuzzle";
import { useOperatorActionsHiddenForHunt } from "../hooks/persisted-state";
import BookmarkButton from "./BookmarkButton";
import PuzzleActivity from "./PuzzleActivity";
import PuzzleAnswer from "./PuzzleAnswer";
import PuzzleDeleteModal from "./PuzzleDeleteModal";
import type { PuzzleModalFormSubmitPayload } from "./PuzzleModalForm";
import PuzzleModalForm from "./PuzzleModalForm";
import TagList from "./TagList";
import { backgroundColorLookupTable } from "./styling/constants";
import { mediaBreakpointDown } from "./styling/responsive";
import { useTracker } from "meteor/react-meteor-data";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import {
  faNoteSticky,
  faPenNib,
  faPhone,
  faThumbTack,
} from "@fortawesome/free-solid-svg-icons";
import {
  Badge,
  Overlay,
  OverlayTrigger,
  Popover,
  Table,
  Tooltip,
} from "react-bootstrap";
import RelativeTime from "./RelativeTime";
import ChatMessage from "./ChatMessage";
import indexedDisplayNames from "../indexedDisplayNames";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import { faEye } from "@fortawesome/free-regular-svg-icons";

const StyledPopover = styled(Popover)`
  max-width: none;
  display: flex;

  flex-direction: column;
  background-color: black;
  color: white;

  .popover-body {
    overflow: auto;
  }
`;

const StyledPopoverHeader = styled(Popover.Header)`
  background-color: black;
  color: white;
`;

const FilteredChatFields = [
  "_id",
  "puzzle",
  "content",
  "sender",
  "timestamp",
] as const;

const PuzzleDiv = styled.div<{
  $solvedness: Solvedness;
}>`
  ${({ $solvedness }) => css`
    background-color: ${backgroundColorLookupTable[$solvedness]};
  `}

  display: flex;
  flex-direction: row;
  align-items: first baseline;
  justify-content: flex-start;
  line-height: 24px;
  padding: 4px 2px;
  margin-bottom: 4px;
  ${mediaBreakpointDown(
    "xs",
    css`
      flex-wrap: wrap;
    `,
  )}
`;

const PuzzleNote = styled.span`
  min-width: 4.66rem;
  align-items: left;
  justify-content: flex-end;
  text-align: right;
  margin: 0 0 0 0.5rem;

  span {
    margin-right: 0.25rem;
    margin-left: 0.125rem;
  }
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
    pinnedmessages: ChatMessageType[] | null;

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
    pinnedMessage,
  }: {
    puzzle: PuzzleType;
    bookmarked: boolean;
    // All tags associated with the hunt.
    allTags: TagType[];
    canUpdate: boolean;
    showSolvers: boolean;
    suppressTags?: string[];
    segmentAnswers?: boolean;
    subscribers: Record<string, string[]> | null;
    pinnedMessage: ChatMessageType | null;
  }) => {
    const target = useRef(null);
    const puzzleId = puzzle._id;
    const huntId = puzzle.hunt;

    useSubscribeDisplayNames(huntId);

    const displayNames = indexedDisplayNames();
    const [operatorActionsHidden] = useOperatorActionsHiddenForHunt(
      puzzle.hunt,
    );

    // add a list of people viewing a puzzle to activity
    const viewers = (subscribers?.viewers ?? []).filter(Boolean);
    const rtcViewers = (subscribers?.callers ?? []).filter(Boolean);
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
        updatePuzzle.call({ puzzleId: puzzleId, ...rest }, callback);
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

    const editButtons = useMemo(() => {
      if (showEdit) {
        return (
          <>
            <StyledButton
              onClick={onShowEditModal}
              variant="light"
              title="Edit puzzle..."
            >
              <FontAwesomeIcon icon={faEdit} />
            </StyledButton>
            {!puzzle.deleted && (
              <StyledButton
                onClick={onShowDeleteModal}
                variant="light"
                title="Delete puzzle..."
              >
                <FontAwesomeIcon icon={faMinus} />
              </StyledButton>
            )}
          </>
        );
      }
      return null;
    }, [showEdit, puzzle.deleted, onShowEditModal, onShowDeleteModal]);

    // id, title, answer, tags
    const linkTarget = `/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`;
    const tagIndex = indexedById(allTags);

    const isMeta = puzzle.tags.some(
      (tagId) => tagIndex.get(tagId)?.name === "is:meta",
    );
    const isMetameta = puzzle.tags.some(
      (tagId) => tagIndex.get(tagId)?.name === "is:metameta",
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
    // const statusEmoji = isHighPriority ? "🚨" : isLowPriority ? "🔽" : isStuck ? "🤷" : null;
    const statusEmoji = isHighPriority ? "🚨" : isLowPriority ? "🔽" : null;
    // const statusTooltipText = isHighPriority ? 'High priority' : isLowPriority ? 'Low priority' : isStuck ? 'Stuck' : null;
    const statusTooltipText = isHighPriority
      ? "High priority"
      : isLowPriority
        ? "Low priority"
        : null;
    const statusTooltip = statusEmoji ? (
      <Tooltip id={`puzzle-status-tooltip-${puzzleId}`}>
        <span>{statusTooltipText}</span>
      </Tooltip>
    ) : null;

    // Now that we're putting those tags elsewhere, we're going to suppress them as well
    // but only the ones that are displayed
    const emojified_tags: String[] = [];
    if (isMetameta) {
      emojified_tags.push("is:metameta");
    } else if (isMeta) {
      emojified_tags.push("is:meta");
    }

    if (isHighPriority) {
      emojified_tags.push("priority:high");
    } else if (isLowPriority) {
      emojified_tags.push("priority:low");
    }
    if (isStuck) {
      emojified_tags.push("is:stuck", "stuck");
    }
    const extra_suppress = allTags
      .filter((t) => emojified_tags.includes(t.name))
      .map((t) => t._id);

    const shownTags = difference(
      puzzle.tags,
      suppressTags?.concat(extra_suppress) ?? [],
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
          // eslint-disable-next-line react/no-array-index-key
          key={`${i}-${answer}`}
          answer={answer}
          respace={segmentAnswers}
          breakable={!segmentAnswers}
          indented={!segmentAnswers}
        />
      );
    });

    const selfUser = useTracker(() => Meteor.user()!, []);
    const selfUserId = selfUser._id;

    const { pinTooltip, ttRelTime } = useTracker(() => {
      if (!pinnedMessage) {
        return {
          pinTooltip: null,
          ttRelTime: null,
        };
      }
      const noteTT = (
        <Tooltip
          id={`puzzle-pin-message-${puzzleId}`}
          style={{
            maxHeight: "9.55rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "... (truncated)",
            borderRadius: "5px",
          }}
        >
          <ChatMessage
            message={pinnedMessage.content}
            displayNames={displayNames}
            selfUserId={selfUserId}
            timestamp={pinnedMessage.pinTs}
          />
        </Tooltip>
      );

      const relTime = (
        <RelativeTime
          date={pinnedMessage?.pinTs}
          terse
          minimumUnit="minute"
          maxElements={1}
        />
      );
      return {
        pinTooltip: noteTT,
        ttRelTime: relTime,
      };
    }, [pinnedMessage?.content, pinnedMessage?.pinTs]);

    const { noteTooltip, noteRelTime } = useTracker(() => {
      if (!puzzle.noteContent) {
        return {
          noteTooltip: null,
          noteRelTime: null,
        };
      }
      const note = puzzle.noteContent;

      const noteTT = [];
      if (note.summary) {
        noteTT.push(
          <div>
            <strong>Summary:</strong> {note.summary}
          </div>,
        );
      }
      if (note.flavor) {
        noteTT.push(
          <div>
            <strong>Flavor: </strong> <em>{note.flavor}</em>
          </div>,
        );
      }
      if (note.theories) {
        noteTT.push(
          <div>
            <strong>Theories: </strong> <em>{note.theories}</em>
          </div>,
        );
      }
      if (note.keywords) {
        noteTT.push(
          <div>
            <strong>Keywords: </strong> <em>{note.keywords.join(", ")}</em>
          </div>,
        );
      }

      const noteRel = (
        <RelativeTime
          date={puzzle.noteUpdateTs}
          terse
          minimumUnit="minute"
          maxElements={1}
        />
      );

      return {
        noteTooltip: (
          <Tooltip
            id={`puzzle-pin-message-${puzzleId}`}
            placement="top"
            style={{
              maxHeight: "9.55rem",
              borderRadius: "5px",
            }}
          >
            {noteTT}
          </Tooltip>
        ),
        noteRelTime: noteRel,
      };
    }, [puzzleId, puzzle.noteContent, puzzle.noteUpdateTs]);

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
              variant="light"
            />
            {showEdit && editButtons}
          </ButtonGroup>
        </PuzzleControlButtonsColumn>
        <PuzzleTitleColumn>
          <Link to={linkTarget}>{puzzle.title}</Link>
          {puzzle.noteContent && noteTooltip ? (
            <OverlayTrigger
              placement="top"
              overlay={noteTooltip}
              trigger={["hover", "click"]}
            >
              <PuzzleNote>
                <FontAwesomeIcon icon={faPenNib} />
                {noteRelTime}
              </PuzzleNote>
            </OverlayTrigger>
          ) : null}
          {pinnedMessage && pinTooltip ? (
            <OverlayTrigger placement="top" overlay={pinTooltip}>
              <PuzzleNote>
                <FontAwesomeIcon icon={faThumbTack} />
                {ttRelTime}
              </PuzzleNote>
            </OverlayTrigger>
          ) : null}
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
              overlay={<Tooltip id={`$stuck-tt-{puzzleId}`}>Stuck</Tooltip>}
            >
              <span>🤷</span>
            </OverlayTrigger>
          ) : null}
        </PuzzlePriorityColumn>
        <PuzzleMetaColumn>
          {isMetameta ? (
            <Badge pill bg="secondary">
              Metameta
            </Badge>
          ) : isMeta ? (
            <Badge pill bg="secondary">
              Meta
            </Badge>
          ) : null}
        </PuzzleMetaColumn>
        <SolversColumn>
          {showSolvers && solvedness === "unsolved" ? (
            <div>
              {rtcViewers.length > 0 ? (
                <span>
                  <FontAwesomeIcon icon={faPhone} />{" "}
                </span>
              ) : null}
              {rtcViewers.map((viewer) => viewer).join(", ")}
              {rtcViewers.length > 0 && viewers.length > 0 ? <br /> : null}
              {viewers.length > 0 ? (
                <span>
                  <FontAwesomeIcon icon={faEye} />{" "}
                </span>
              ) : null}
              {viewers.map((viewer) => viewer).join(", ")}
            </div>
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
