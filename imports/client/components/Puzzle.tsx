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
import { DiscordAccountType } from "../../lib/models/DiscordAccount";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import useSubscribeAvatars from "../hooks/useSubscribeAvatars";
import Peers from "../../lib/models/mediasoup/Peers";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { Subscribers } from "../subscribers";

interface ViewerSubscriber {
  user: string;
  name: string | undefined;
  discordAccount: DiscordAccountType | undefined;
  tab: string | undefined;
}

import useTypedSubscribe from "../hooks/useTypedSubscribe";
import chatMessagesForPuzzle from "../../lib/publications/chatMessagesForPuzzle";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import ChatMessages from "../../lib/models/ChatMessages";
import { faNoteSticky } from "@fortawesome/free-solid-svg-icons";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import RelativeTime from "./RelativeTime";
import { useFind, useTracker } from "meteor/react-meteor-data";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import ChatMessage from "./ChatMessage";
import indexedDisplayNames from "../indexedDisplayNames";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";

const FilteredChatFields = [
  "_id",
  "puzzle",
  "content",
  "sender",
  "timestamp",
] as const;
type FilteredChatMessageType = Pick<
  ChatMessageType,
  (typeof FilteredChatFields)[number]
>;

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
  }: {
    puzzle: PuzzleType;
    bookmarked: boolean;
    // All tags associated with the hunt.
    allTags: TagType[];
    canUpdate: boolean;
    showSolvers: boolean;
    suppressTags?: string[];
    segmentAnswers?: boolean;
  }) => {

    const puzzleId = puzzle._id;
    const huntId = puzzle.hunt;

    useSubscribeDisplayNames(huntId);

    const displayNames = indexedDisplayNames();
    const [operatorActionsHidden] = useOperatorActionsHiddenForHunt(
      puzzle.hunt,
    );
    const puzzleId = puzzle._id;
    const huntId = puzzle.hunt;

    // add a list of people viewing a puzzle to activity
    const subscriberTopic = `puzzle:${puzzleId}`;
    const subscribersLoading = useSubscribe("subscribers.fetch", subscriberTopic);
    const callMembersLoading = useSubscribe(
      "mediasoup:metadata",
      huntId,
      puzzleId,
    );
    const avatarsLoading = useSubscribeAvatars(huntId);

    const loading =
      subscribersLoading() || callMembersLoading() || avatarsLoading();


    const { unknown, viewers, rtcViewers } = useTracker(() => {
      if (loading) {
        return {
          unknown: 0,
          viewers: [],
          rtcViewers: [],
          selfPeer: undefined,
        };
      }

      let unknownCount = 0;
      const viewersAcc: ViewerSubscriber[] = [];

      const rtcViewersAcc: ViewerSubscriber[] = [];
      const rtcViewerIndex: Record<string, boolean> = {};

      const rtcParticipants = Peers.find({
        hunt: huntId,
        call: puzzleId,
      }).fetch();
      rtcParticipants.forEach((p) => {
        const user = MeteorUsers.findOne(p.createdBy);
        if (!user?.displayName) {
          unknownCount += 1;
          return;
        }

        // If the same user is joined twice (from two different tabs), dedupe in
        // the viewer listing. (We include both in rtcParticipants still.)
        rtcViewersAcc.push({
          user: user._id,
          name: user.displayName,
          discordAccount: user.discordAccount,
          tab: p.tab,
        });
        rtcViewerIndex[user._id] = true;
      });

      Subscribers.find({ name: subscriberTopic }).forEach((s) => {
        if (rtcViewerIndex[s.user]) {
          // already counted among rtcViewers, don't duplicate
          return;
        }

        const user = MeteorUsers.findOne(s.user);
        if (!user?.displayName) {
          unknownCount += 1;
          return;
        }

        viewersAcc.push({
          user: s.user,
          name: user.displayName,
          discordAccount: user.discordAccount,
          tab: undefined,
        });
      });

      return {
        unknown: unknownCount,
        viewers: viewersAcc,
        rtcViewers: rtcViewersAcc,
      };
    }, [loading, subscriberTopic, huntId, puzzleId]);

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
    const shownTags = difference(puzzle.tags, suppressTags ?? []);
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

    useTypedSubscribe(chatMessagesForPuzzle, {
      puzzleId,
      huntId,
    });

    const puzzlePin: FilteredChatMessageType[] = useFind(
      () => ChatMessages.find({puzzle:puzzleId, pinned:true}, { sort:{ timestamp: -1 }, limit: 1 }),
      [puzzleId],
    );

    const pinnedMessage = puzzlePin[0];

    let noteTooltip = {};

    const senderDisplayName = pinnedMessage?.sender !== undefined ? (displayNames.get(pinnedMessage.sender) ?? "???") : "jolly-roger";
    const selfUser = useTracker(() => Meteor.user()!, []);
    const selfUserId = selfUser._id;

    if (pinnedMessage) {
      noteTooltip = (
        <Tooltip
          id={`puzzle-note-update-${puzzleId}`}
          style={{maxHeight: "9.55rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "... (truncated)", borderRadius: "5px"}}
        >
          <ChatMessage
            message={pinnedMessage.content}
            displayNames={displayNames}
            selfUserId={selfUserId}
            timestamp={pinnedMessage.timestamp}
          />
        </Tooltip>
      );
    }

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
          {
            pinnedMessage ? (
              <OverlayTrigger placement="top" overlay={noteTooltip}>
              <PuzzleNote>
                <FontAwesomeIcon icon={faNoteSticky} />
                <RelativeTime
                  date={pinnedMessage?.timestamp}
                  terse
                  minimumUnit="minute"
                  maxElements={1}
                />
              </PuzzleNote>
              </OverlayTrigger>
            ): null
          }
        </PuzzleTitleColumn>
        { showSolvers && solvedness === 'unsolved' ? (
          <SolversColumn>
          {viewers.map((viewer)=>(viewer.name)).join(', ')}
          </SolversColumn>
        ) : null }
        <PuzzleActivityColumn>
          {solvedness === "unsolved" && (
            <PuzzleActivity
              huntId={puzzle.hunt}
              puzzleId={puzzle._id}
              unlockTime={puzzle.createdAt}
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
