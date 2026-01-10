import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";
import { faAngleDoubleUp } from "@fortawesome/free-solid-svg-icons/faAngleDoubleUp";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons/faChevronLeft";
import { faComments } from "@fortawesome/free-solid-svg-icons/faComments";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons/faExternalLinkAlt";
import { faFaceSmile } from "@fortawesome/free-solid-svg-icons/faFaceSmile";
import { faImage } from "@fortawesome/free-solid-svg-icons/faImage";
import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { faMapPin } from "@fortawesome/free-solid-svg-icons/faMapPin";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons/faPaperPlane";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faReply } from "@fortawesome/free-solid-svg-icons/faReply";
import { faReplyAll } from "@fortawesome/free-solid-svg-icons/faReplyAll";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import type { ComponentPropsWithRef, FC, MouseEvent } from "react";
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import type { FormControlProps } from "react-bootstrap/FormControl";
import FormControl from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import InputGroup from "react-bootstrap/InputGroup";
import Modal from "react-bootstrap/Modal";
import Offcanvas from "react-bootstrap/Offcanvas";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import ProgressBar from "react-bootstrap/ProgressBar";
import Row from "react-bootstrap/Row";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import Tooltip from "react-bootstrap/Tooltip";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import type { Descendant } from "slate";
import styled, { css, keyframes, useTheme } from "styled-components";
import {
  calendarTimeFormat,
  shortCalendarTimeFormat,
} from "../../lib/calendarTimeFormat";
import { messageDingsUser } from "../../lib/dingwordLogic";
import { indexedById, sortedBy } from "../../lib/listUtils";
import Bookmarks from "../../lib/models/Bookmarks";
import type { ChatMessageType } from "../../lib/models/ChatMessages";
import ChatMessages from "../../lib/models/ChatMessages";
import type { DocumentType } from "../../lib/models/Documents";
import Documents from "../../lib/models/Documents";
import type { GuessType } from "../../lib/models/Guesses";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import type { TagType } from "../../lib/models/Tags";
import Tags from "../../lib/models/Tags";
import nodeIsImage from "../../lib/nodeIsImage";
import nodeIsMention from "../../lib/nodeIsMention";
import nodeIsRoleMention from "../../lib/nodeIsRoleMention";
import nodeIsText from "../../lib/nodeIsText";
import {
  listAllRolesForHunt,
  userMayUpdateGuessesForHunt,
  userMayWritePuzzlesForHunt,
} from "../../lib/permission_stubs";
import chatMessagesForPuzzle from "../../lib/publications/chatMessagesForPuzzle";
import puzzleForPuzzlePage from "../../lib/publications/puzzleForPuzzlePage";
import puzzlesForHunt from "../../lib/publications/puzzlesForHunt";
import { computeSolvedness } from "../../lib/solvedness";
import addPuzzleAnswer from "../../methods/addPuzzleAnswer";
import addPuzzleTag from "../../methods/addPuzzleTag";
import createChatImageUpload from "../../methods/createChatImageUpload";
import createGuess from "../../methods/createGuess";
import ensurePuzzleDocument from "../../methods/ensurePuzzleDocument";
import removeChatMessage from "../../methods/removeChatMessage";
import removePuzzleAnswer from "../../methods/removePuzzleAnswer";
import removePuzzleTag from "../../methods/removePuzzleTag";
import sendChatMessage from "../../methods/sendChatMessage";
import setChatMessagePin from "../../methods/setChatMessagePin";
import undestroyPuzzle from "../../methods/undestroyPuzzle";
import updatePuzzle from "../../methods/updatePuzzle";
import EnabledChatImage from "../EnabledChatImage";
import { useBreadcrumb } from "../hooks/breadcrumb";
import {
  useOperatorActionsHiddenForHunt,
  usePersistedSidebarWidth,
} from "../hooks/persisted-state";
import useBlockUpdate from "../hooks/useBlockUpdate";
import type { Action, CallState } from "../hooks/useCallState";
import useCallState from "../hooks/useCallState";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import type { Theme } from "../theme";
import { trace } from "../tracing";
import BookmarkButton from "./BookmarkButton";
import ChatMessage from "./ChatMessage";
import ChatPeople from "./ChatPeople";
import CopyToClipboardButton from "./CopyToClipboardButton";
import DocumentDisplay, { DocumentMessage } from "./DocumentDisplay";
import type { FancyEditorHandle, MessageElement } from "./FancyEditor";
import FancyEditor from "./FancyEditor";
import GuessState from "./GuessState";
import InsertImage from "./InsertImage";
import Markdown from "./Markdown";
import MinimizedChatInfo from "./MinimizedChatInfo";
import type { ModalFormHandle } from "./ModalForm";
import ModalForm from "./ModalForm";
import PuzzleAnswer from "./PuzzleAnswer";
import type { PuzzleModalFormSubmitPayload } from "./PuzzleModalForm";
import PuzzleModalForm from "./PuzzleModalForm";
import SplitPaneMinus from "./SplitPaneMinus";
import Breakable from "./styling/Breakable";
import { MonospaceFontFamily } from "./styling/constants";
import FixedLayout from "./styling/FixedLayout";
import { mediaBreakpointDown } from "./styling/responsive";
import TagList from "./TagList";

// Shows a state dump as an in-page overlay when enabled.
const DEBUG_SHOW_CALL_STATE = false;

const tabId = Random.id();

const FilteredChatFields = [
  "_id",
  "puzzle",
  "content",
  "sender",
  "timestamp",
  "pinTs",
  "parentId",
  "attachments",
  "hunt",
] as const;
type FilteredChatMessageType = Pick<
  ChatMessageType,
  (typeof FilteredChatFields)[number]
>;

// It doesn't need to be, but this is consistent with the 576px transition used in other pages' css
const MinimumSidebarWidth = 176;
const MinimumDocumentWidth = 400;
const DefaultSidebarWidth = 200;

const MinimumDesktopWidth = MinimumSidebarWidth + MinimumDocumentWidth;

// PuzzlePage has some pretty unique properties:
//
// * It's the only page which iframes other sites.  Doing so requires that we
//   specify the absolute size and position of the iframe, which makes us need
//   position: fixed.
// * There's up to three interesting pieces of content shown on this page:
//   * Chat
//   * Puzzle metadata (title, solved, puzzle link, guesses, tags)
//   * The collaborative document (usually a spreadsheet)
//   All three of them may have more content than fits reasonably on the screen,
//   so managing their sizes effectively is important.
// * At smaller screen sizes, we try to collapse content so the most useful
//   interactions are still possible.  On mobile, it often makes more sense to
//   delegate document interaction to the native Google apps.  Chat (and which
//   puzzle you're looking at) are the most important panes, since when people
//   are on runarounds the chat is the thing they want to see/write in most, and
//   that's the most common time you'd be using jolly-roger from a mobile device.
//
//   Given these priorities, we have several views:
//
//   a: chat and voicechat
//   b: metadata
//   c: document
//
//   Wide (>=MinimiumDesktopWidth) - "desktop"
//    _____________________________
//   |      |         b            |
//   |  a   |______________________|
//   |      |                      |
//   |      |                      |
//   |      |         c            |
//   |      |                      |
//   |______|______________________|
//
//   Narrow (<MinimumDesktopWidth) - "mobile"
//    ____________
//   |     b     |
//   |___________|
//   |           |
//   |     a     |
//   |           |
//   |___________|

const PinDiv = styled.div`
min-height: 3em;
height: auto;
max-height: 12em;
overflow-y: scroll;
overflow-x: hidden;
border-bottom: 4px double black;
background-color: ${({ theme }) => theme.colors.pinnedChatMessageBackground};
`;

const ChatHistoryDiv = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;

  /* Nothing should overflow the box, but if you nest blockquotes super deep you
     can do horrible things.  We should still avoid horizontal scroll bars,
     since they make the log harder to read at the bottom. */
  overflow-x: hidden;
`;

const ReplyIcon = styled(FontAwesomeIcon)`
  cursor: pointer;
  margin-right: 4px;
  color: #666;
`;

const ReplyPopover = styled(Popover)`
  box-shadow: 0 4px 8px rgb(0 0 0 / 20%);
  max-width: 600px;
`;

const ReplyPopoverBody = styled(Popover.Body)`
  padding: 8px;
`;

const ReplyPopoverContent = styled.div`
  max-width: 400px;
  max-height: 200px;
  overflow-y: auto;
  padding: 0;
  margin: 0;
`;

const ReplyPopoverMessage = styled.div`
  padding: 0;
  margin: 0;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }
`;

const ReplyPopoverMore = styled.div`
  padding: 0; /* Reduced padding */
  cursor: pointer;
  color: blue;
  text-decoration: underline;
`;

const ReplyPopoverSender = styled.div`
  font-weight: bold;
  margin-bottom: 2px;
`;

const ReplyButton = styled(FontAwesomeIcon)`
  cursor: pointer;
  color: #666;
  margin-left: 4px;

  &:hover {
    color: #000;
  }
`;

const PUZZLE_PAGE_PADDING = 8;

const ChatMessageDiv = styled.div<{
  $isSystemMessage: boolean;
  $isHighlighted: boolean;
  $isPinned: boolean;
  $isPulsing: boolean;
  $isReplyingTo: boolean;
  theme: Theme;
}>`
  padding: 0 ${PUZZLE_PAGE_PADDING}px 2px;
  overflow-wrap: break-word;
  font-size: 0.8rem;
  position: relative;
  ${({ $isSystemMessage, $isHighlighted }) =>
    $isHighlighted &&
    !$isSystemMessage &&
    css`
      background-color: ${({ theme }) => theme.colors.pinnedChatMessageBackground};
      `}

  ${({ $isSystemMessage }) =>
    $isSystemMessage &&
    css`
      background-color: ${({ theme }) => theme.colors.systemChatMessageBackground};
    `}

  ${({ $isPinned }) =>
    $isPinned &&
    css`
      background-color: ${({ theme }) => theme.colors.pinnedChatMessageBackground};
    `}
    ${({ $isPulsing }) =>
      $isPulsing &&
      css`
      animation: pulse 1s ease-in-out;
    `}

  @keyframes pulse {
    0% {
      background-color: #ffff70;
    }

    50% {
      background-color: #ffff6d;
    }

    100% {
      background-color: #ffff70;
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.hoverChatMessageBackground};
  }

  ${({ $isReplyingTo }) =>
    $isReplyingTo &&
    css`
      background-color: ${({ theme }) => theme.colors.replyChatMessageBackground};
      `}
`;

const ChatMessageActions = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  opacity: 0;
  z-index: 10;
  transition: opacity 0.2s ease-in-out;
  ${ChatMessageDiv}:hover & {
    opacity: 1;
  }

  & > * {
    margin-left: 0;
  }
`;

const SplitPill = styled.div`
  display: inline-flex;
  align-items: stretch;
  justify-content: center;
  background-color: #d3d3d3;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  color: #666;
  margin: 4px;

  &:hover {
    color: #000;
  }
`;

const PillSection = styled.div`
  padding: 4px 7px;
  display: flex;
  align-items: center;
  flex-grow: 1;
  flex-basis: 0;
  text-align: center;
  white-space: nowrap;
  justify-content: center;

  &:not(:last-child) {
    border-right: 1px solid #bbb;
  }

  &:hover {
    background-color: #c0c0c0;
  }
`;

const ChatInputRow = styled.div`
  padding: ${PUZZLE_PAGE_PADDING}px;
  padding-bottom: max(
    env(safe-area-inset-bottom, 0px),
    ${PUZZLE_PAGE_PADDING}px
  );
  position: relative;
`;

const ReplyingTo = styled.div<{ theme: Theme }>`
  background-color: ${({ theme }) => theme.colors.replyingToBackground};
  padding: 4px;
  margin-bottom: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const ReplyingToCancel = styled(FontAwesomeIcon)`
  cursor: pointer;
  margin-left: auto;
`;

const ChatMessageTimestamp = styled.span`
  float: right;
  font-style: italic;
  font-size: 12px;
  color: #666;
`;

const ChatSectionDiv = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-flow: column;
  overflow: hidden;

  p,
  ul,
  blockquote,
  pre {
    margin-bottom: 0;
  }

  blockquote {
    font-size: 14px;
    margin-left: 10px;
    border-left-color: #aaa;
  }
`;

const PuzzleContent = styled.div`
  display: flex;
  flex-direction: column;

  /* position: relative; */
`;

const buttonPulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0px rgba(0, 123, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(0, 123, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0px rgba(0, 123, 255, 0);
  }
`;

const PuzzleMetadata = styled.div`
  flex: none;
  padding: ${PUZZLE_PAGE_PADDING - 2}px 8px;
  border-bottom: 1px solid #dadce0;
  z-index: 10;
  background-color: ${({ theme }) => theme.colors.background};

  .resource-selector-pulse {
    animation: ${buttonPulseAnimation} 1s 2;
    border-radius: 6px;
  }
`;

const PuzzleMetadataAnswer = styled.span`
  background-color: ${({ theme }) => theme.colors.solvedness.solved};
  overflow: hidden;

  /* Tag-like */
  display: inline-flex;
  align-items: center;
  line-height: 24px;
  margin: 2px 4px 2px 0;
  padding: 0 6px;
  border-radius: 4px;
`;

const AnswerRemoveButton: FC<ComponentPropsWithRef<typeof Button>> = styled(
  Button,
)`
  /* Specifier boost needed to override Bootstrap button style */
  && {
    margin: 0 -6px 0 6px;
    padding: 0;
  }
`;
const PuzzleMetadataFloatingButton = styled(Button)`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
`;

const PuzzleMetadataRow = styled.div`
  display: flex;
  width: 100%;
  font-size: 14px;
  align-items: center;
  align-content: flex-start;
  justify-content: flex-start;
  flex-wrap: wrap;
`;

const PuzzleMetadataActionRow = styled(PuzzleMetadataRow)`
  align-items: center;
  flex-wrap: wrap;

  a {
    margin-right: 8px;
  }
`;

const PuzzleMetadataButtons = styled.div`
  margin-left: auto;
  display: flex;
  flex-wrap: nowrap;

  button {
    margin: 2px 0 2px 8px;
  }
`;

const PuzzleMetadataAnswers = styled.span`
  display: flex;
  flex-grow: 1;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  flex-wrap: wrap;
  overflow: hidden;
`;

const PuzzleMetadataExternalLink = styled.a`
  display: inline-block;
  font-weight: bold;
  white-space: nowrap;
`;

const StyledTagList = styled(TagList)`
  display: contents;
`;

const AnswerFormControl = styled(FormControl)`
  text-transform: uppercase;
  font-family: ${MonospaceFontFamily};
  font-weight: 400;
`;

const ReactionPill = styled.span<{ $userHasReacted: boolean }>`
  background-color: ${({ $userHasReacted }) =>
    $userHasReacted ? "#cce5ff" : "#d3d3d3"};
  padding: 4px 8px;
  margin: 4px;
  border-radius: 16px;
  cursor: pointer;
  border: ${({ $userHasReacted }) =>
    $userHasReacted ? "1px solid #007bff" : "none"};
`;

const ReactionContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  position: relative;
  z-index: 100;
`;

const isReaction = (
  message: ChatMessageType | FilteredChatMessageType,
): boolean => {
  try {
    const parsedContent = message.content;
    if (
      parsedContent?.children &&
      parsedContent.children.length === 1 &&
      parsedContent.children[0].text &&
      parsedContent.children[0].text.length > 0 &&
      /^\p{Extended_Pictographic}/u.test(parsedContent.children[0].text)
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const AddReactionButton = styled(FontAwesomeIcon)`
  cursor: pointer;
  color: #666;
  align-items: center;
  justify-content: center;
  margin-left: 4px;

  &:hover {
    color: #000;
  }
`;

const AddReactionPill = styled.span`
background-color: #d3d3d3;
padding: 4px 8px;
margin: 4px;
align-content: center;
justify-content: center;
border-radius: 16px;
cursor: pointer;
color: #666;
`;

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 1000;
  transform: scale(0.7);
  transform-origin: bottom left;
`;

const ChatHistoryMessage = React.memo(
  ({
    message,
    displayNames,
    isSystemMessage,
    isHighlighted,
    isPinned,
    suppressSender,
    selfUserId,
    scrollToMessage,
    parentId,
    messageRef,
    isPulsing,
    setReplyingTo,
    isReplyingTo,
    shownEmojiPicker,
    setShownEmojiPicker,
    puzzles,
    roles,
    imageOnLoad,
  }: {
    message: FilteredChatMessageType;
    displayNames: Map<string, string>;
    isSystemMessage: boolean;
    isHighlighted: boolean;
    isPinned: boolean;
    suppressSender: boolean;
    selfUserId: string;
    scrollToMessage: (messageId: string, callback?: () => void) => void;
    parentId?: string;
    messageRef: (el: HTMLDivElement | null) => void;
    isPulsing: boolean;
    setReplyingTo: (messageId: string | null) => void;
    isReplyingTo: boolean;
    shownEmojiPicker: string | null;
    setShownEmojiPicker: (messageId: string | null) => void;
    puzzles: PuzzleType[];
    roles: string[];
    imageOnLoad: () => void;
  }) => {
    const ts = shortCalendarTimeFormat(message.timestamp);

    const senderDisplayName =
      message.sender !== undefined
        ? (isPinned ? "📌 " : "") + (displayNames.get(message.sender) ?? "???")
        : "jolly-roger";

    const [parentMessages, setParentMessages] = useState<
      FilteredChatMessageType[]
    >([]);
    const [hasMoreParents, setHasMoreParents] = useState<boolean>(false);
    const [nextParentId, setNextParentId] = useState<string | undefined>(
      undefined,
    );
    const [showPopover, setShowPopover] = useState<boolean>(false);
    const [isMouseOverIcon, _setIsMouseOverIcon] = useState<boolean>(false);
    const [isMouseOverPopover, setIsMouseOverPopover] =
      useState<boolean>(false);
    const popoverTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (parentId) {
        const parents: FilteredChatMessageType[] = [];
        let currentParentId: string | undefined = parentId;
        let depth = 0;
        let nextParent;

        while (currentParentId && depth < 3) {
          const parentMessage = ChatMessages.findOne(currentParentId);
          if (parentMessage) {
            parents.push(parentMessage);
            nextParent = parentMessage.parentId;
            currentParentId = parentMessage.parentId;
          } else {
            currentParentId = undefined;
          }
          depth++;
        }

        setHasMoreParents(!!currentParentId);
        setNextParentId(nextParent);
        setParentMessages(parents.reverse());
      } else {
        setParentMessages([]);
        setHasMoreParents(false);
        setNextParentId(undefined);
      }
    }, [parentId]);

    const handlePopoverMouseEnter = () => {
      setIsMouseOverPopover(true);
    };

    const handlePopoverMouseLeave = () => {
      setIsMouseOverPopover(false);
    };

    useEffect(() => {
      if (popoverTimeout.current) {
        clearTimeout(popoverTimeout.current);
        popoverTimeout.current = null;
      }

      if (!isMouseOverIcon && !isMouseOverPopover && showPopover) {
        popoverTimeout.current = setTimeout(() => {
          setShowPopover(false);
        }, 300);
      }
    }, [isMouseOverIcon, isMouseOverPopover, showPopover]);

    const puzzlesById = useTracker(() => {
      return puzzles.reduce((acc, puz) => {
        return acc.set(puz._id, puz);
      }, new Map<string, PuzzleType>());
    }, [puzzles]);

    const replyPopover = (
      <ReplyPopover
        id={`reply-popover-${message._id}`}
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
      >
        <Popover.Header as="h3">Replying to:</Popover.Header>
        <ReplyPopoverBody>
          <ReplyPopoverContent>
            {hasMoreParents && (
              <ReplyPopoverMore onClick={() => scrollToMessage(nextParentId!)}>
                More ...
              </ReplyPopoverMore>
            )}
            {parentMessages.map((parent) => (
              <ReplyPopoverMessage key={parent._id}>
                <ReplyPopoverSender>
                  {displayNames.get(parent.sender) ?? "???"}
                </ReplyPopoverSender>
                <ChatMessage
                  message={parent.content}
                  displayNames={displayNames}
                  puzzleData={puzzlesById}
                  selfUserId={selfUserId}
                />
              </ReplyPopoverMessage>
            ))}
          </ReplyPopoverContent>
        </ReplyPopoverBody>
      </ReplyPopover>
    );

    const reactions: ChatMessageType[] = useTracker(() => {
      return ChatMessages.find({ parentId: message._id })
        .fetch()
        .filter(isReaction);
    }, [message._id]);

    const reactionCounts = useMemo(() => {
      const counts = new Map<string, number>();
      const userEmojiMap = new Map<string, Set<string>>(); // Map of emoji to set of userIds

      reactions.forEach((reaction) => {
        const emoji = reaction.content.children[0].text;
        const userId = reaction.sender;

        if (!userEmojiMap.has(emoji)) {
          userEmojiMap.set(emoji, new Set());
        }

        if (!userEmojiMap.get(emoji)!.has(userId)) {
          userEmojiMap.get(emoji)!.add(userId);
          counts.set(emoji, (counts.get(emoji) || 0) + 1);
        }
      });
      return counts;
    }, [reactions]);

    const reactionUsers = useMemo(() => {
      const users = new Map<string, Set<string>>();
      reactions.forEach((reaction) => {
        users.set(
          reaction.content.children[0].text,
          (users.get(reaction.content.children[0].text) || new Set()).add(
            displayNames.get(reaction.sender) ?? "???",
          ),
        );
      });
      return users;
    }, [reactions, displayNames]);

    const userReactions = useMemo(() => {
      return reactions.filter((reaction) => reaction.sender === selfUserId);
    }, [reactions, selfUserId]);

    const handleReactionClick = (emoji: string) => {
      const existingReaction = userReactions.find((reaction) => {
        return reaction.content.children[0].text === emoji;
      });

      if (existingReaction) {
        removeChatMessage.call({ id: existingReaction._id });
      } else {
        sendChatMessage.call({
          puzzleId: message.puzzle,
          content: JSON.stringify({
            type: "message",
            children: [{ text: emoji }],
          }),
          parentId: message._id,
        });
      }
    };

    const emojiPickerButtonRef = useRef<HTMLSpanElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const handleAddReactionClick = () => {
      setShownEmojiPicker(
        shownEmojiPicker === message._id ? null : message._id,
      );
    };

    const handleClickOutsideEmojiPicker = useCallback(
      (event: MouseEvent) => {
        // Use .current checks to ensure refs are available
        if (
          emojiPickerRef.current &&
          !emojiPickerRef.current.contains(event.target as Node) &&
          emojiPickerButtonRef.current &&
          !emojiPickerButtonRef.current.contains(event.target as Node)
        ) {
          setShownEmojiPicker(null);
        }
      },
      [setShownEmojiPicker],
    );

    useEffect(() => {
      document.addEventListener("mousedown", handleClickOutsideEmojiPicker);

      return () => {
        document.removeEventListener(
          "mousedown",
          handleClickOutsideEmojiPicker,
        );
      };
    }, [handleClickOutsideEmojiPicker]);

    const handleEmojiClick = (emojiData: { emoji: string }) => {
      handleReactionClick(emojiData.emoji);
      setShownEmojiPicker(null);
    };

    const theme = useTheme();

    const emojiPicker =
      shownEmojiPicker === message._id && emojiPickerButtonRef.current
        ? createPortal(
            <EmojiPickerContainer
              ref={emojiPickerRef}
              style={{
                bottom: `${
                  window.innerHeight -
                  emojiPickerButtonRef.current.getBoundingClientRect().top
                }px`,
                left: `${emojiPickerButtonRef.current.getBoundingClientRect().left}px`,
              }}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                emojiStyle={EmojiStyle.NATIVE}
                skinTonesDisabled={true}
                lazyLoadEmojis={true}
                reactionsDefaultOpen={true}
                reactions={["2705", "274e", "2757", "2753", "2194-fe0f"]}
                previewConfig={{ showPreview: false }}
                theme={theme.basicMode}
              />
            </EmojiPickerContainer>,
            document.body,
          )
        : null;

    const toggleMessagePin = useCallback(() => {
      setChatMessagePin.call({
        messageId: message._id,
        puzzleId: message.puzzle,
        huntId: message.hunt,
        newPinState: message.pinTs === null,
      });
    }, [message]);

    return (
      <ChatMessageDiv
        $isSystemMessage={isSystemMessage}
        $isHighlighted={isHighlighted && !isSystemMessage && !isPinned}
        $isPinned={isPinned}
        ref={messageRef}
        $isPulsing={isPulsing}
        $isReplyingTo={isReplyingTo}
      >
        <ChatMessageActions>
          <SplitPill>
            <PillSection
              onClick={handleAddReactionClick}
              ref={emojiPickerButtonRef}
              title={"React"}
            >
              <AddReactionButton icon={faFaceSmile} />
            </PillSection>
            <PillSection
              title={"Reply"}
              onClick={() => setReplyingTo(message._id)}
            >
              <ReplyButton icon={faReplyAll} />
            </PillSection>
            <PillSection
              title={message.pinTs ? "Remove pin" : "Pin"}
              onClick={() => toggleMessagePin(message._id)}
            >
              <ReplyButton icon={faMapPin} />
            </PillSection>
          </SplitPill>
        </ChatMessageActions>
        {!suppressSender && <ChatMessageTimestamp>{ts}</ChatMessageTimestamp>}
        {(!suppressSender || parentId) && (
          <span style={{ display: "flex", alignItems: "center" }}>
            {parentId && (
              <OverlayTrigger
                placement="top"
                overlay={replyPopover}
                trigger={["hover", "focus"]}
              >
                <span style={{ cursor: "pointer" }}>
                  <ReplyIcon
                    icon={faReply}
                    onClick={() => scrollToMessage(parentId)}
                  />
                </span>
              </OverlayTrigger>
            )}
            <strong style={{ marginLeft: parentId ? "4px" : "0" }}>
              {senderDisplayName}
            </strong>
          </span>
        )}
        <ChatMessage
          message={message.content}
          displayNames={displayNames}
          puzzleData={puzzlesById}
          selfUserId={selfUserId}
          roles={roles}
          imageOnLoad={imageOnLoad}
        />
        <ReactionContainer>
          {Array.from(reactionCounts.entries()).map(([emoji, count]) => {
            const userHasReacted = userReactions.some(
              (reaction) => reaction.content.children[0].text === emoji,
            );
            const users = Array.from(reactionUsers.get(emoji) ?? []).sort();
            return (
              <ReactionPill
                title={users.length > 0 ? users.join("\n") : undefined}
                key={emoji}
                $userHasReacted={userHasReacted}
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji} {count > 1 ? `${count}` : null}
              </ReactionPill>
            );
          })}
          {reactionCounts.size > 0 && (
            <AddReactionPill
              onClick={handleAddReactionClick}
              ref={emojiPickerButtonRef}
              title={"React"}
            >
              <AddReactionButton icon={faFaceSmile} />
            </AddReactionPill>
          )}
        </ReactionContainer>
        {emojiPicker}
      </ChatMessageDiv>
    );
  },
);

type ChatHistoryHandle = {
  saveScrollBottomTarget: () => void;
  snapToBottom: () => void;
  scrollToTarget: () => void;
  scrollToMessage: (messageId: string, callback?: () => void) => void;
};

const ChatHistory = React.forwardRef(
  (
    {
      huntId,
      displayNames,
      selfUser,
      pulsingMessageId,
      setPulsingMessageId,
      setReplyingTo,
      replyingTo,
      puzzles,
      chatMessages,
    }: {
      huntId: string;
      displayNames: Map<string, string>;
      selfUser: Meteor.User;
      pulsingMessageId: string | null;
      setPulsingMessageId: (messageId: string | null) => void;
      setReplyingTo: (messageId: string | null) => void;
      replyingTo: string | null;
      puzzles: PuzzleType[];
      chatMessages: FilteredChatMessageType[];
    },
    forwardedRef: React.Ref<ChatHistoryHandle>,
  ) => {
    const ref = useRef<HTMLDivElement>(null);
    const scrollBottomTarget = useRef<number>(0);
    const shouldIgnoreNextScrollEvent = useRef<boolean>(false);

    const saveScrollBottomTarget = useCallback(() => {
      if (ref.current) {
        const rect = ref.current.getClientRects()[0]!;
        const scrollHeight = ref.current.scrollHeight;
        const scrollTop = ref.current.scrollTop;
        const hiddenHeight = scrollHeight - rect.height;
        const distanceFromBottom = hiddenHeight - scrollTop;
        trace("ChatHistory saveScrollBottomTarget", {
          distanceFromBottom,
          scrollHeight,
          scrollTop,
          rectHeight: rect.height,
          hiddenHeight,
        });
        scrollBottomTarget.current = distanceFromBottom;
      }
    }, []);

    const onScrollObserved = useCallback(() => {
      // When we call scrollToTarget and it actually changes scrollTop, this triggers a scroll event.
      // If the element's scrollHeight or clientHeight changed after scrollToTarget was called, we'd
      // mistakenly save an incorrect scrollBottomTarget.  So skip one scroll event when we self-induce
      // this callback, so we only update the target distance from bottom when the user is actually
      // scrolling.
      trace("ChatHistory onScrollObserved", {
        ignoring: shouldIgnoreNextScrollEvent.current,
      });
      if (shouldIgnoreNextScrollEvent.current) {
        shouldIgnoreNextScrollEvent.current = false;
      } else {
        saveScrollBottomTarget();
      }
    }, [saveScrollBottomTarget]);

    const scrollToTarget = useCallback(() => {
      if (ref.current) {
        const rect = ref.current.getClientRects()[0]!;
        const scrollHeight = ref.current.scrollHeight;
        const scrollTop = ref.current.scrollTop;
        const hiddenHeight = scrollHeight - rect.height;
        // if distanceFromBottom is hiddenHeight - scrollTop, then
        // our desired scrollTop is hiddenHeight - distanceFromBottom
        const scrollTopTarget = hiddenHeight - scrollBottomTarget.current;
        trace("ChatHistory scrollToTarget", {
          hasRef: true,
          target: scrollBottomTarget.current,
          scrollHeight,
          scrollTop,
          rectHeight: rect.height,
          hiddenHeight,
          alreadyIgnoringNextScrollEvent: shouldIgnoreNextScrollEvent.current,
        });
        if (scrollTop !== scrollTopTarget) {
          shouldIgnoreNextScrollEvent.current = true;
          ref.current.scrollTop = scrollTopTarget;
        }
      } else {
        trace("ChatHistory scrollToTarget", {
          hasRef: false,
          target: scrollBottomTarget.current,
        });
      }
    }, []);

    const snapToBottom = useCallback(() => {
      trace("ChatHistory snapToBottom");
      scrollBottomTarget.current = 0;
      scrollToTarget();
    }, [scrollToTarget]);

    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const scrollToMessageInternal = useCallback(
      (messageId: string, callback?: () => void) => {
        const messageElement = messageRefs.current.get(messageId);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: "smooth" });
          if (callback) {
            callback();
          }
        }
      },
      [],
    );

    useImperativeHandle(forwardedRef, () => ({
      saveScrollBottomTarget,
      snapToBottom,
      scrollToTarget,
      scrollToMessage: scrollToMessageInternal,
    }));

    const highlightMessage = useCallback(
      (messageId: string) => {
        setPulsingMessageId(messageId);
      },
      [setPulsingMessageId],
    );

    useEffect(() => {
      if (pulsingMessageId) {
        const timeout = setTimeout(() => {
          setPulsingMessageId(null);
        }, 1000);
        return () => clearTimeout(timeout);
      }
    }, [pulsingMessageId, setPulsingMessageId]);

    useLayoutEffect(() => {
      // Scroll to end of chat on initial mount.
      trace("ChatHistory snapToBottom on mount");
      snapToBottom();
    }, [snapToBottom]);

    useEffect(() => {
      // Add resize handler that scrolls to target
      window.addEventListener("resize", scrollToTarget);

      return () => {
        window.removeEventListener("resize", scrollToTarget);
      };
    }, [scrollToTarget]);

    const scrollChat = useCallback(() => {
      // Whenever we rerender due to new messages arriving, make our
      // distance-from-bottom match the previous one, if it's larger than some
      // small fudge factor.  But if the user has actually scrolled into the backlog,
      // don't move the backlog while they're reading it -- instead, assume they want
      // to see the same messages in the same position, and adapt the target bottom
      // distance instead.
      trace("ChatHistory useLayoutEffect", {
        scrollBottomTarget: scrollBottomTarget.current,
        action: scrollBottomTarget.current > 60 ? "save" : "snap",
        messageCount: chatMessages.length,
      });
      if (scrollBottomTarget.current > 60) {
        saveScrollBottomTarget();
      } else {
        snapToBottom();
      }
    }, [chatMessages.length, saveScrollBottomTarget, snapToBottom]);

    const [shownEmojiPicker, setShownEmojiPicker] = useState<string | null>(
      null,
    );

    const roles = useMemo(
      () => listAllRolesForHunt(selfUser, { _id: huntId }),
      [selfUser, huntId],
    );

    trace("ChatHistory render", { messageCount: chatMessages.length });
    return (
      <ChatHistoryDiv ref={ref} onScroll={onScrollObserved}>
        {chatMessages.length === 0 ? (
          <ChatMessageDiv
            key="no-message"
            $isSystemMessage={false}
            $isHighlighted={false}
          >
            <span>No chatter yet. Say something?</span>
          </ChatMessageDiv>
        ) : undefined}
        {chatMessages.map((msg, index, messages) => {
          // Only suppress sender and timestamp if:
          // * this is not the first message
          // * this message was sent by the same person as the previous message
          // * this message was sent within 60 seconds (60000 milliseconds) of the previous message
          // * the message is not pinned
          if (isReaction(msg)) {
            return null;
          }
          const lastMessage = index > 0 ? messages[index - 1] : undefined;
          const suppressSender =
            !!lastMessage &&
            lastMessage.sender === msg.sender &&
            lastMessage.timestamp.getTime() + 60000 > msg.timestamp.getTime() &&
            msg.pinTs == null;
          const isHighlighted = messageDingsUser(msg, selfUser);
          return (
            <ChatHistoryMessage
              key={msg._id}
              message={msg}
              displayNames={displayNames}
              isSystemMessage={msg.sender === undefined}
              isPinned={msg.pinTs != null}
              isHighlighted={isHighlighted}
              suppressSender={suppressSender}
              selfUserId={selfUser._id}
              scrollToMessage={(messageId: string) => {
                scrollToMessageInternal(messageId, () => {
                  highlightMessage(messageId);
                });
              }}
              parentId={msg.parentId}
              messageRef={(el) => messageRefs.current.set(msg._id, el!)}
              isPulsing={pulsingMessageId === msg._id}
              setReplyingTo={setReplyingTo}
              isReplyingTo={replyingTo === msg._id}
              shownEmojiPicker={shownEmojiPicker}
              setShownEmojiPicker={setShownEmojiPicker}
              puzzles={puzzles}
              roles={roles}
              imageOnLoad={scrollChat}
            />
          );
        })}
      </ChatHistoryDiv>
    );
  },
);

const PinnedMessage = React.forwardRef(
  (
    {
      pinnedMessage,
      displayNames,
      selfUser,
      scrollToMessage,
      pulsingMessageId,
      setReplyingTo,
      puzzles,
    }: {
      pinnedMessage: FilteredChatMessageType[];
      displayNames: Map<string, string>;
      selfUser: Meteor.User;
      scrollToMessage: (messageId: string, callback?: () => void) => void;
      pulsingMessageId: string | null;
      setReplyingTo: (messageId: string | null) => void;
      puzzles: PuzzleType[];
    },
    forwardedRef: React.Ref<ChatHistoryHandle>,
  ) => {
    const ref = useRef<HTMLDivElement>(null);
    const scrollBottomTarget = useRef<number>(0);
    const shouldIgnoreNextScrollEvent = useRef<boolean>(false);

    const saveScrollBottomTarget = useCallback(() => {
      if (ref.current) {
        const rect = ref.current.getClientRects()[0]!;
        const scrollHeight = ref.current.scrollHeight;
        const scrollTop = ref.current.scrollTop;
        const hiddenHeight = scrollHeight - rect.height;
        const distanceFromBottom = hiddenHeight - scrollTop;
        trace("ChatHistory saveScrollBottomTarget", {
          distanceFromBottom,
          scrollHeight,
          scrollTop,
          rectHeight: rect.height,
          hiddenHeight,
        });
        scrollBottomTarget.current = distanceFromBottom;
      }
    }, []);

    const onScrollObserved = useCallback(() => {
      // When we call scrollToTarget and it actually changes scrollTop, this triggers a scroll event.
      // If the element's scrollHeight or clientHeight changed after scrollToTarget was called, we'd
      // mistakenly save an incorrect scrollBottomTarget.  So skip one scroll event when we self-induce
      // this callback, so we only update the target distance from bottom when the user is actually
      // scrolling.
      trace("ChatHistory onScrollObserved", {
        ignoring: shouldIgnoreNextScrollEvent.current,
      });
      if (shouldIgnoreNextScrollEvent.current) {
        shouldIgnoreNextScrollEvent.current = false;
      } else {
        saveScrollBottomTarget();
      }
    }, [saveScrollBottomTarget]);

    const scrollToTarget = useCallback(() => {
      if (ref.current) {
        const rect = ref.current.getClientRects()[0]!;
        const scrollHeight = ref.current.scrollHeight;
        const scrollTop = ref.current.scrollTop;
        const hiddenHeight = scrollHeight - rect.height;
        // if distanceFromBottom is hiddenHeight - scrollTop, then
        // our desired scrollTop is hiddenHeight - distanceFromBottom
        const scrollTopTarget = hiddenHeight - scrollBottomTarget.current;
        trace("ChatHistory scrollToTarget", {
          hasRef: true,
          target: scrollBottomTarget.current,
          scrollHeight,
          scrollTop,
          rectHeight: rect.height,
          hiddenHeight,
          alreadyIgnoringNextScrollEvent: shouldIgnoreNextScrollEvent.current,
        });
        if (scrollTop !== scrollTopTarget) {
          shouldIgnoreNextScrollEvent.current = true;
          ref.current.scrollTop = scrollTopTarget;
        }
      } else {
        trace("ChatHistory scrollToTarget", {
          hasRef: false,
          target: scrollBottomTarget.current,
        });
      }
    }, []);

    const snapToBottom = useCallback(() => {
      trace("ChatHistory snapToBottom");
      scrollBottomTarget.current = 0;
      scrollToTarget();
    }, [scrollToTarget]);

    const scrollToMessageInternal = useCallback(
      (messageId: string, callback?: () => void) => {
        if (scrollToMessage) {
          scrollToMessage(messageId, callback);
        }
      },
      [scrollToMessage],
    );

    useImperativeHandle(forwardedRef, () => ({
      saveScrollBottomTarget,
      snapToBottom,
      scrollToTarget,
      scrollToMessage: scrollToMessageInternal,
    }));

    useLayoutEffect(() => {
      // Scroll to end of chat on initial mount.
      trace("ChatHistory snapToBottom on mount");
      snapToBottom();
    }, [snapToBottom]);

    useEffect(() => {
      // Add resize handler that scrolls to target
      window.addEventListener("resize", scrollToTarget);

      return () => {
        window.removeEventListener("resize", scrollToTarget);
      };
    }, [scrollToTarget]);

    trace("Pinned message render", { messageCount: pinnedMessage.length });
    return pinnedMessage.length === 0 ? null : (
      <PinDiv ref={ref} onScroll={onScrollObserved}>
        {pinnedMessage.map((msg) => {
          return (
            <ChatHistoryMessage
              key={msg._id}
              message={msg}
              displayNames={displayNames}
              isSystemMessage={msg.sender === undefined}
              isPinned={msg.pinTs !== null}
              isHighlighted={false}
              suppressSender={false}
              selfUserId={selfUser._id}
              scrollToMessage={scrollToMessageInternal}
              messageRef={() => {}}
              isPulsing={pulsingMessageId === msg._id}
              setReplyingTo={setReplyingTo}
              puzzles={puzzles}
            />
          );
        })}
      </PinDiv>
    );
  },
);

// The ESlint prop-types check seems to stumble over prop type checks somehow
// if we put the memo() and forwardRef() on the same line above.
const PinnedMessageMemo = React.memo(PinnedMessage);
const ChatHistoryMemo = React.memo(ChatHistory);

const StyledFancyEditor = styled(FancyEditor)`
  flex: 1;
  display: block;
  background-color: ${({ theme }) => theme.colors.fancyEditorBackground};
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  line-height: 20px;
  padding: 4px;
  resize: none;
`;

const initialValue: Descendant[] = [
  {
    type: "message",
    children: [
      {
        text: "",
      },
    ],
  },
];

const ChatInput = React.memo(
  React.forwardRef<
    ChatInputHandle,
    {
      onHeightChange: () => void;
      onMessageSent: () => void;
      huntId: string;
      puzzleId: string;
      disabled: boolean;
      replyingTo: string | null;
      setReplyingTo: (messageId: string | null) => void;
      displayNames: Map<string, string>;
      puzzles: PuzzleType[];
      scrollToMessage: (messageId: string, callback?: () => void) => void;
      sidebarWidth: number;
    }
  >(
    (
      {
        onHeightChange,
        onMessageSent,
        huntId,
        puzzleId,
        disabled,
        replyingTo,
        setReplyingTo,
        displayNames,
        puzzles,
        scrollToMessage,
      },
      forwardedRef,
    ) => {
      // We want to have hunt profile data around so we can autocomplete from multiple fields.
      const profilesLoadingFunc = useSubscribe("huntProfiles", huntId);
      const profilesLoading = profilesLoadingFunc();
      const [uploadImageError, setUploadImageError] = useState<string>();
      const clearUploadImageError = useCallback(
        () => setUploadImageError(undefined),
        [],
      );
      const users = useTracker(() => {
        return profilesLoading
          ? []
          : MeteorUsers.find({
              hunts: huntId,
              displayName: { $ne: undefined }, // no point completing a user with an unset displayName
            }).fetch();
      }, [huntId, profilesLoading]);

      const onHeightChangeCb = useCallback(
        (newHeight: number) => {
          if (onHeightChange) {
            trace("ChatInput onHeightChange", { newHeight });
            onHeightChange();
          }
        },
        [onHeightChange],
      );

      const preventDefaultCallback = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
      }, []);

      const [content, setContent] = useState<Descendant[]>(initialValue);
      const fancyEditorRef = useRef<FancyEditorHandle | null>(null);
      const onContentChange = useCallback(
        (newContent: Descendant[]) => {
          setContent(newContent);
          onHeightChangeCb(0);
        },
        [onHeightChangeCb],
      );
      const hasNonTrivialContent = useMemo(() => {
        return (
          content.length > 0 &&
          (content[0]! as MessageElement).children.some((child) => {
            return (
              nodeIsImage(child) ||
              nodeIsMention(child) ||
              nodeIsRoleMention(child) ||
              (nodeIsText(child) && child.text.trim().length > 0)
            );
          })
        );
      }, [content]);

      const hasLoadingImage = useMemo(() => {
        return (
          content.length > 0 &&
          (content[0]! as MessageElement).children.some((child) => {
            return nodeIsImage(child) && child.status === "loading";
          })
        );
      }, [content]);

      const sendContentMessage = useCallback(() => {
        if (hasNonTrivialContent && !hasLoadingImage) {
          // Prepare to send message to server.

          // Take only the first Descendant; we normalize the input to a single
          // block with type "message".
          const message = content[0]! as MessageElement;
          // Strip out children from mention elements.  We only need the type and
          // userId for display purposes.
          const { type, children } = message;
          const cleanedMessage = {
            type,
            children: children
              .filter((child) => {
                if (nodeIsMention(child) || nodeIsRoleMention(child)) {
                  return true;
                }
                if (nodeIsImage(child) && child.status !== "success") {
                  return false;
                }
                if (nodeIsText(child) && child.text === "") {
                  return false;
                }
                return true;
              })
              .map((child) => {
                if (nodeIsMention(child)) {
                  return {
                    type: child.type,
                    userId: child.userId,
                  };
                } else if (nodeIsRoleMention(child)) {
                  return {
                    type: child.type,
                    roleId: child.roleId,
                  };
                } else if (nodeIsImage(child)) {
                  return {
                    type: child.type,
                    url: child.url,
                  };
                } else {
                  return child;
                }
              }),
          };

          // Send chat message.
          sendChatMessage.call({
            puzzleId,
            content: JSON.stringify(cleanedMessage),
            parentId: replyingTo,
          });
          setContent(initialValue);
          fancyEditorRef.current?.clearInput();
          if (onMessageSent) {
            onMessageSent();
          }
          return true;
        }
        return false;
      }, [
        hasNonTrivialContent,
        hasLoadingImage,
        content,
        puzzleId,
        onMessageSent,
        replyingTo,
      ]);

      useBlockUpdate(
        hasNonTrivialContent
          ? "You're in the middle of typing a message."
          : undefined,
      );

      const fileInputRef = useRef<HTMLInputElement>(null);

      const handleButtonClick = useCallback(() => {
        fileInputRef.current?.click();
      }, []);

      const uploadImageFile = useCallback(
        (file: File) => {
          const tempId = Random.id();
          fancyEditorRef.current?.insertImage("", tempId, "loading");

          createChatImageUpload.call(
            {
              puzzleId,
              mimeType: file.type,
            },
            (err, upload) => {
              if (err || !upload) {
                fancyEditorRef.current?.replaceImage("", tempId, "error");
                setUploadImageError(
                  err?.message ??
                    "S3 presignedPost creation failed, check server settings to ensure S3 image bucket is configured correctly.",
                );
              } else {
                const { publicUrl, uploadUrl, fields } = upload;
                const formData = new FormData();
                for (const [key, value] of Object.entries(fields)) {
                  formData.append(key, value);
                }
                formData.append("file", file);
                fetch(uploadUrl, {
                  method: "POST",
                  mode: "no-cors",
                  body: formData,
                })
                  .then(() => {
                    fancyEditorRef.current?.replaceImage(
                      publicUrl,
                      tempId,
                      "success",
                    );
                  })
                  .catch((uploadErr) => {
                    fancyEditorRef.current?.replaceImage("", tempId, "error");
                    setUploadImageError(
                      `S3 upload failed: ${uploadErr.message}`,
                    );
                  });
              }
            },
          );
        },
        [puzzleId],
      );

      function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          setUploadImageError("Only image files can be uploaded in chat.");
          return;
        }
        uploadImageFile(file);
      }

      useSubscribe("enabledChatImage");
      const enabledChatImage = useTracker(
        () => EnabledChatImage.findOne("enabledChatImage")?.enabled ?? false,
        [],
      );

      const errorModal = (
        <Modal show onHide={clearUploadImageError}>
          <Modal.Header closeButton>Error uploading image to chat</Modal.Header>
          <Modal.Body>
            <p>
              Something went wrong while uploading images to the chat. Contact
              admin with the error message for help.
            </p>
            <p>Error message: {uploadImageError}</p>
          </Modal.Body>
        </Modal>
      );

      const parentMessage = useTracker(() => {
        if (replyingTo) {
          return ChatMessages.findOne(replyingTo);
        }
        return undefined;
      }, [replyingTo]);

      const parentSenderName = useTracker(() => {
        if (parentMessage) {
          return parentMessage.sender
            ? (displayNames.get(parentMessage.sender) ?? "???")
            : "jolly-roger";
        }
        return undefined;
      }, [displayNames, parentMessage]);

      useImperativeHandle(forwardedRef, () => ({
        focus: () => fancyEditorRef.current?.focus(),
      }));

      return (
        <ChatInputRow>
          {replyingTo && parentSenderName && (
            <ReplyingTo onClick={() => scrollToMessage(replyingTo)}>
              Replying to {parentSenderName}
              <ReplyingToCancel
                icon={faTimes}
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyingTo(null);
                }}
              />
            </ReplyingTo>
          )}
          {uploadImageError && createPortal(errorModal, document.body)}
          <InputGroup>
            <StyledFancyEditor
              ref={fancyEditorRef}
              className="form-control"
              initialContent={content}
              placeholder="Chat"
              users={users}
              puzzles={puzzles}
              onContentChange={onContentChange}
              onSubmit={sendContentMessage}
              uploadImageFile={uploadImageFile}
              disabled={disabled}
            />
            <Button
              variant="secondary"
              onClick={sendContentMessage}
              onMouseDown={preventDefaultCallback}
              disabled={disabled || !hasNonTrivialContent || hasLoadingImage}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </Button>
            {enabledChatImage && (
              <>
                <Button variant="secondary" onClick={handleButtonClick}>
                  <FontAwesomeIcon icon={faImage} />
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
              </>
            )}
          </InputGroup>
        </ChatInputRow>
      );
    },
  ),
);

interface ChatSectionHandle {
  scrollHistoryToTarget: () => void;
  scrollToMessage: (messageId: string, callback?: () => void) => void;
  snapToBottom: () => void;
  focus: () => void;
}

const AttachmentsSection = React.forwardRef(
  ({
    chatMessages,
    displayNames,
    puzzleData,
    showHighlights,
    handleOpen,
    handleClose,
    handleHighlightMessageClick,
  }: {
    chatMessages: FilteredChatMessageType[];
    displayNames: Map<string, string>;
    puzzleData: Map<string, PuzzleType>;
    showHighlights: boolean;
    handleOpen: () => void;
    handleClose: () => void;
    handleHighlightMessageClick: (messageId: string) => void;
  }) => {
    const userId = Meteor.userId()!;
    const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
    const handleSelectTab = useCallback(
      (key: string | null) => setActiveTabKey(key),
      [],
    );

    const tabDefinitions = useMemo(() => {
      const messagesById = chatMessages.reduce((mp, c) => {
        mp.set(c._id, c);
        return mp;
      }, new Map<string, ChatMessageType>());

      const tabs = [
        {
          key: "attachments",
          title: "Attachments",
          messages: chatMessages.filter(
            (c) => c.attachments && c.attachments.length >= 1,
          ),
        },
        {
          key: "repliesToUser",
          title: "Replies",
          messages: chatMessages.filter((c) => {
            const parentId = c.parentId;
            return parentId && messagesById?.get(parentId)?.sender === userId;
          }),
        },
        {
          key: "yourMentions",
          title: "Mentions",
          messages: chatMessages.filter((c) =>
            c.content.children.some(
              (t) => nodeIsMention(t) && t.userId === userId,
            ),
          ),
        },
        {
          key: "pinned",
          title: "Pins",
          messages: chatMessages.filter((c) => c.pinTs),
        },
        {
          key: "system",
          title: "System",
          messages: chatMessages.filter((c) => !c.sender),
        },
      ];

      return tabs
        .map((tab) => ({ ...tab, count: tab.messages.length }))
        .filter((tab) => tab.count > 0);
    }, [chatMessages, userId]);

    const totalInterestingMessages = useMemo(
      () => tabDefinitions.reduce((sum, tab) => sum + tab.count, 0),
      [tabDefinitions],
    );

    useEffect(() => {
      if (tabDefinitions.length > 0 && !activeTabKey) {
        setActiveTabKey(tabDefinitions[0].key);
      } else if (tabDefinitions.length === 0) {
        setActiveTabKey(null);
      }
    }, [tabDefinitions, activeTabKey]);

    const idPrefix = useId();

    if (totalInterestingMessages === 0) {
      return null;
    }

    return (
      <>
        <Button size="sm" onClick={handleOpen} variant="secondary">
          Highlights (
          {totalInterestingMessages < 100 ? totalInterestingMessages : "99+"})
        </Button>
        <Offcanvas show={showHighlights} onHide={handleClose}>
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Highlights</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            {tabDefinitions.length > 0 ? (
              <Tabs
                activeKey={activeTabKey ?? undefined}
                onSelect={handleSelectTab}
                id={`${idPrefix}-interesting-messages-tabs`}
                justify
                className="mb-3"
              >
                {tabDefinitions.map(({ key, title, messages, count }) => (
                  <Tab key={key} eventKey={key} title={`${title} (${count})`}>
                    {messages.map((cm) => (
                      <ChatMessageDiv
                        key={cm._id}
                        $isSystemMessage={!cm.sender}
                        $isHighlighted={false}
                        $isPinned={!!cm.pinTs}
                        $isPulsing={false}
                        $isReplyingTo={false}
                        onClick={() => handleHighlightMessageClick(cm._id)}
                      >
                        <ChatMessageTimestamp>
                          {shortCalendarTimeFormat(cm.timestamp)}
                        </ChatMessageTimestamp>
                        <span style={{ display: "flex", alignItems: "center" }}>
                          <strong>
                            {cm.sender
                              ? (displayNames.get(cm.sender) ?? "???")
                              : "jolly-roger"}
                          </strong>
                        </span>
                        <ChatMessage
                          message={cm.content}
                          displayNames={displayNames}
                          puzzleData={puzzleData}
                          selfUserId={userId}
                          attachments={cm.attachments}
                        />
                      </ChatMessageDiv>
                    ))}
                  </Tab>
                ))}
              </Tabs>
            ) : (
              <p>No interesting messages found in this category.</p> // Handle case where a tab might become empty after initial load
            )}
          </Offcanvas.Body>
        </Offcanvas>
      </>
    );
  },
);

const ChatSection = React.forwardRef(
  (
    {
      chatDataLoading,
      disabled,
      displayNames,
      puzzles,
      chatMessages,
      puzzleId,
      huntId,
      callState,
      callDispatch,
      selfUser,
      pulsingMessageId,
      setPulsingMessageId,
      replyingTo,
      setReplyingTo,
      sidebarWidth,
      showHighlights,
      handleOpen,
      handleClose,
      handleHighlightMessageClick,
    }: {
      chatDataLoading: boolean;
      disabled: boolean;
      displayNames: Map<string, string>;
      puzzles: PuzzleType[];
      chatMessages: FilteredChatMessageType[];
      puzzleId: string;
      huntId: string;
      callState: CallState;
      callDispatch: React.Dispatch<Action>;
      selfUser: Meteor.User;
      pulsingMessageId: string | null;
      setPulsingMessageId: (messageId: string | null) => void;
      replyingTo: string | null;
      setReplyingTo: (messageId: string | null) => void;
      sidebarWidth: number;
      showHighlights: boolean;
      handleOpen: () => void;
      handleClose: () => void;
      handleHighlightMessageClick: (messageId: string) => void;
    },
    forwardedRef: React.Ref<ChatSectionHandle>,
  ) => {
    const historyRef = useRef<React.ElementRef<typeof ChatHistoryMemo>>(null);
    const inputRef = useRef<ChatInputHandle>(null);
    const scrollToTargetRequestRef = useRef<boolean>(false);

    const scrollHistoryToTarget = useCallback(() => {
      trace("ChatSection scrollHistoryToTarget", {
        hasRef: !!historyRef.current,
        alreadyWantsDeferredScroll: scrollToTargetRequestRef.current,
      });
      if (historyRef.current) {
        historyRef.current.scrollToTarget();
      } else {
        // useLayoutEffect runs effects depth-first, which means when this
        // component is being rendered, the layout effects of our children
        // will fire while historyRef is null.  So if we get a request to
        // scroll to target during that time window, save it for later, and
        // fire it off again in our own useLayoutEffect hook.
        scrollToTargetRequestRef.current = true;
      }
    }, []);

    const onMessageSent = useCallback(() => {
      trace("ChatSection onMessageSent", { hasRef: !!historyRef.current });
      setReplyingTo(null);
      if (historyRef.current) {
        historyRef.current.snapToBottom();
      }
    }, [setReplyingTo]);

    const scrollToMessage = useCallback(
      (messageId: string, callback?: () => void) => {
        if (historyRef.current) {
          historyRef.current.scrollToMessage(messageId, callback);
        }
      },
      [],
    );

    const highlightMessage = useCallback((messageId: string) => {
      if (historyRef.current) {
        historyRef.current.highlightMessage(messageId);
      }
    }, []);

    const snapToBottom = useCallback(() => {
      trace("ChatSection snapToBottom", { hasRef: !!historyRef.current });
      if (historyRef.current) {
        historyRef.current.snapToBottom();
      }
    }, []);

    const focus = useCallback(() => {
      inputRef.current?.focus();
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      scrollHistoryToTarget,
      scrollToMessage,
      highlightMessage,
      snapToBottom,
      focus,
    }));

    useLayoutEffect(() => {
      trace("ChatSection useLayoutEffect", {
        wantDeferredScroll: scrollToTargetRequestRef.current,
        hasRef: !!historyRef.current,
      });
      if (scrollToTargetRequestRef.current && historyRef.current) {
        scrollToTargetRequestRef.current = false;
        historyRef.current.scrollToTarget();
      }
    });

    trace("ChatSection render", { chatDataLoading });

    const puzzlesById = useTracker(() => {
      return puzzles.reduce((acc, puz) => {
        return acc.set(puz._id, puz);
      }, new Map<string, PuzzleType>());
    }, [puzzles]);

    const pinnedMessage = useMemo(() => {
      // Filter for pinned messages and sort by pinTs descending
      const pinned = chatMessages.filter((m) => m.pinTs);
      if (pinned.length === 0) return [];

      return pinned
        .sort((a, b) => {
          const dateA = a.pinTs instanceof Date ? a.pinTs.getTime() : 0;
          const dateB = b.pinTs instanceof Date ? b.pinTs.getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 1); // Limit to 1, matching previous logic
    }, [chatMessages]);

    if (chatDataLoading) {
      return <ChatSectionDiv>loading...</ChatSectionDiv>;
    }

    return (
      <ChatSectionDiv>
        <ChatPeople
          huntId={huntId}
          puzzleId={puzzleId}
          disabled={disabled}
          onHeightChange={scrollHistoryToTarget}
          callState={callState}
          callDispatch={callDispatch}
        />
        <PinnedMessageMemo
          pinnedMessage={pinnedMessage}
          displayNames={displayNames}
          selfUser={selfUser}
          puzzles={puzzles}
          scrollToMessage={scrollToMessage}
          pulsingMessageId={pulsingMessageId}
          setReplyingTo={setReplyingTo}
        />
        <ChatHistoryMemo
          ref={historyRef}
          displayNames={displayNames}
          selfUser={selfUser}
          puzzles={puzzles}
          scrollToMessage={scrollToMessage}
          pulsingMessageId={pulsingMessageId}
          setPulsingMessageId={setPulsingMessageId}
          setReplyingTo={setReplyingTo}
          replyingTo={replyingTo}
          chatMessages={chatMessages}
          huntId={huntId}
        />
        <ChatInput
          huntId={huntId}
          ref={inputRef}
          puzzleId={puzzleId}
          disabled={disabled}
          onHeightChange={scrollHistoryToTarget}
          onMessageSent={onMessageSent}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          displayNames={displayNames}
          puzzles={puzzles}
          scrollToMessage={scrollToMessage}
          sidebarWidth={sidebarWidth}
        />
        <AttachmentsMemo
          chatMessages={chatMessages}
          displayNames={displayNames}
          puzzleData={puzzlesById}
          showHighlights={showHighlights}
          handleOpen={handleOpen}
          handleClose={handleClose}
          handleHighlightMessageClick={handleHighlightMessageClick}
        />
      </ChatSectionDiv>
    );
  },
);
const ChatSectionMemo = React.memo(ChatSection);
const AttachmentsMemo = React.memo(AttachmentsSection);

const PuzzlePageMetadata = ({
  isMinimized,
  puzzle,
  bookmarked,
  displayNames,
  document,
  allPuzzles,
  isDesktop,
  selfUser,
  toggleMetadataMinimize,
}: {
  isMinimized: boolean;
  puzzle: PuzzleType;
  bookmarked: boolean;
  displayNames: Map<string, string>;
  document?: DocumentType;
  allPuzzles: PuzzleType[];
  isDesktop: boolean;
  selfUser: Meteor.User;
  toggleMetadataMinimize: () => void;
  allDocs: DocumentType[] | undefined;
}) => {
  const huntId = puzzle.hunt;
  const puzzleId = puzzle._id;

  const hunt = useTracker(() => Hunts.findOne(huntId), [huntId]);
  const hasGuessQueue = hunt?.hasGuessQueue ?? false;
  const canUpdate = useTracker(
    () => userMayWritePuzzlesForHunt(Meteor.user(), hunt),
    [hunt],
  );

  const allTags = useTracker(
    () => Tags.find({ hunt: huntId }).fetch(),
    [huntId],
  );
  const guesses = useTracker(
    () => Guesses.find({ hunt: huntId, puzzle: puzzleId }).fetch(),
    [huntId, puzzleId],
  );

  const editModalRef = useRef<React.ElementRef<typeof PuzzleModalForm>>(null);
  const guessModalRef = useRef<React.ElementRef<typeof PuzzleGuessModal>>(null);
  const answerModalRef =
    useRef<React.ElementRef<typeof PuzzleAnswerModal>>(null);
  const onCreateTag = useCallback(
    (tagName: string) => {
      addPuzzleTag.call({ puzzleId, tagName });
    },
    [puzzleId],
  );

  const onRemoveTag = useCallback(
    (tagId: string) => {
      removePuzzleTag.call({ puzzleId, tagId });
    },
    [puzzleId],
  );

  const onRemoveAnswer = useCallback(
    (guessId: string) => {
      removePuzzleAnswer.call({ puzzleId, guessId });
    },
    [puzzleId],
  );

  const onEdit = useCallback(
    (state: PuzzleModalFormSubmitPayload, callback: (err?: Error) => void) => {
      const { huntId: _huntId, docType: _docType, ...rest } = state;
      updatePuzzle.call({ puzzleId, ...rest }, callback);
    },
    [puzzleId],
  );

  const showGuessModal = useCallback(() => {
    if (guessModalRef.current) {
      guessModalRef.current.show();
    }
  }, []);

  const showAnswerModal = useCallback(() => {
    if (answerModalRef.current) {
      answerModalRef.current.show();
    }
  }, []);

  const showEditModal = useCallback(() => {
    if (editModalRef.current) {
      editModalRef.current.show();
    }
  }, []);

  const tagsById = indexedById(allTags);
  const maybeTags: (TagType | undefined)[] = puzzle.tags.map((tagId) => {
    return tagsById.get(tagId);
  });
  const tags: TagType[] = maybeTags.filter<TagType>(
    (t): t is TagType => t !== undefined,
  );
  const correctGuesses = guesses.filter((guess) => guess.state === "correct");
  const numGuesses = guesses.length;

  const answersElement =
    correctGuesses.length > 0 ? (
      <PuzzleMetadataAnswers>
        {correctGuesses.map((guess) => (
          <PuzzleMetadataAnswer key={`answer-${guess._id}`}>
            <PuzzleAnswer answer={guess.guess} breakable />
            {!hasGuessQueue && (
              <AnswerRemoveButton
                variant="success"
                onClick={() => onRemoveAnswer(guess._id)}
              >
                <FontAwesomeIcon fixedWidth icon={faTimes} />
              </AnswerRemoveButton>
            )}
          </PuzzleMetadataAnswer>
        ))}
      </PuzzleMetadataAnswers>
    ) : null;

  const puzzleLink = puzzle.url ? (
    <PuzzleMetadataExternalLink
      href={puzzle.url}
      target="_blank"
      rel="noreferrer noopener"
      title="Open puzzle page"
    >
      <FontAwesomeIcon fixedWidth icon={faPuzzlePiece} /> <span>Puzzle</span>{" "}
      <FontAwesomeIcon fixedWidth icon={faExternalLinkAlt} />
    </PuzzleMetadataExternalLink>
  ) : null;

  const imageInsert = isDesktop &&
    document &&
    document.provider === "google" &&
    document.value.type === "spreadsheet" && (
      <InsertImage documentId={document._id} />
    );

  const documentLink = document ? (
    <span>
      <DocumentDisplay
        document={document}
        displayMode={isDesktop ? "copy" : "link"}
        user={selfUser}
        isShown={false}
      />
    </span>
  ) : null;

  const editButton = canUpdate ? (
    <Button
      onClick={showEditModal}
      variant="secondary"
      size="sm"
      title="Edit puzzle..."
    >
      <FontAwesomeIcon icon={faEdit} /> Edit
    </Button>
  ) : null;

  let guessButton = null;
  if (puzzle.expectedAnswerCount > 0) {
    guessButton = hasGuessQueue ? (
      <>
        <Button variant="primary" size="sm" onClick={showGuessModal}>
          <FontAwesomeIcon icon={faKey} />
          {" Guess "}
          <Badge bg="light" text="dark">
            {numGuesses}
          </Badge>
        </Button>
        <PuzzleGuessModal
          ref={guessModalRef}
          puzzle={puzzle}
          guesses={guesses}
          displayNames={displayNames}
        />
      </>
    ) : (
      <>
        <Button variant="primary" size="sm" onClick={showAnswerModal}>
          <FontAwesomeIcon icon={faKey} />
          {" Answer"}
        </Button>
        <PuzzleAnswerModal
          ref={answerModalRef}
          puzzle={puzzle}
          guesses={guesses}
        />
      </>
    );
  }

  // State and logic for conditional tag rendering
  const actionRowRef = useRef<HTMLDivElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  const [tagsOnSeparateRow, setTagsOnSeparateRow] = useState(false);
  const tagsOnSeparateRowRef = useRef(tagsOnSeparateRow);

  useEffect(() => {
    tagsOnSeparateRowRef.current = tagsOnSeparateRow;
  }, [tagsOnSeparateRow]);

  const checkTagLayout = useCallback(() => {
    if (actionRowRef.current) {
      // Threshold: height slightly larger than a single line of buttons/tags
      const singleLineHeightThreshold = 35;
      const currentHeight = actionRowRef.current.offsetHeight;
      const currentPos = actionRowRef.current.clientHeight;
      const currentActionPos = actionButtonsRef.current.clientHeight;
      const shouldBeSeparate = currentHeight > singleLineHeightThreshold;
      if (
        shouldBeSeparate !== tagsOnSeparateRowRef.current ||
        currentPos !== currentActionPos
      ) {
        tagsOnSeparateRowRef.current = shouldBeSeparate;
        setTagsOnSeparateRow(shouldBeSeparate);
      }
    }
  }, []);

  // Check layout on mount and when tags change
  useLayoutEffect(() => {
    checkTagLayout();
  }, [checkTagLayout]); // Depend on tags

  // Check layout on window resize
  useEffect(() => {
    const handleResize = () => {
      checkTagLayout();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [checkTagLayout]);

  const tagListElement = (
    <StyledTagList
      puzzle={puzzle}
      tags={tags}
      onCreateTag={onCreateTag}
      onRemoveTag={onRemoveTag}
      linkToSearch={false}
      showControls={isDesktop}
      popoverRelated
      allPuzzles={allPuzzles}
      allTags={allTags}
      emptyMessage="No tags yet"
    />
  );

  const minimizeMetadataButton = (
    <OverlayTrigger
      placement="bottom-end"
      overlay={<Tooltip>Hide puzzle information</Tooltip>}
    >
      <Button onClick={toggleMetadataMinimize} size="sm">
        <FontAwesomeIcon icon={faAngleDoubleUp} />
      </Button>
    </OverlayTrigger>
  );

  return !isMinimized ? (
    <div>
      <PuzzleMetadata>
        <PuzzleModalForm
          key={puzzleId}
          ref={editModalRef}
          puzzle={puzzle}
          huntId={huntId}
          tags={allTags}
          onSubmit={onEdit}
        />
        <PuzzleMetadataActionRow ref={actionRowRef}>
          <BookmarkButton
            puzzleId={puzzleId}
            bookmarked={bookmarked}
            variant="link"
            size="sm"
          />
          {puzzleLink}
          {documentLink}
          {!tagsOnSeparateRow && tagListElement}{" "}
          {/* Render tags inline if they fit */}
          <PuzzleMetadataButtons ref={actionButtonsRef}>
            {editButton}
            {imageInsert}
            {guessButton}
            {minimizeMetadataButton}
          </PuzzleMetadataButtons>
        </PuzzleMetadataActionRow>
        <PuzzleMetadataRow>{answersElement}</PuzzleMetadataRow>
        {tagsOnSeparateRow /* Render tags on separate row if they wrapped */ && (
          <PuzzleMetadataRow>{tagListElement}</PuzzleMetadataRow>
        )}
      </PuzzleMetadata>
    </div>
  ) : null;
};

const ValidatedSliderContainer = styled.div`
  display: flex;
  align-items: center;
`;

const GuessTable = styled.div`
  display: grid;
  grid-template-columns:
    [status] 2em
    [answer] auto
    [timestamp] auto
    [submitter] auto
    [direction] 4em
    [confidence] 4em;
  border-bottom: 1px solid #ddd;
  ${mediaBreakpointDown(
    "sm",
    css`
      grid-template-columns: minmax(0, auto) minmax(0, auto);
    `,
  )}
`;

const GuessTableSmallRow = styled.div`
  display: contents;
  background-color: inherit;
  ${mediaBreakpointDown(
    "sm",
    css`
      grid-column: 1 / -1;
      display: flex;
    `,
  )}
`;

const GuessRow = styled.div<{ $state: GuessType["state"] }>`
  display: contents;
  background-color: ${({ $state, theme }) =>
    theme.colors.guess[$state].background};

  &::before {
    content: " ";
    border-top: 1px solid #ddd;
    grid-column: 1 / -1;
  }

  :hover {
    background-color: ${({ $state, theme }) =>
      theme.colors.guess[$state].hoverBackground};
  }
`;

const GuessCell = styled.div`
  display: flex;
  overflow: hidden;
  background-color: inherit;
  align-items: center;
  padding: 0.25rem;
  ${mediaBreakpointDown(
    "sm",
    css`
      outline: 0;
    `,
  )}
`;

const GuessAnswerCell = styled(GuessCell)`
  ${mediaBreakpointDown(
    "sm",
    css`
      flex-grow: 1;
    `,
  )}
`;

const GuessTimestampCell = styled(GuessCell)`
  ${mediaBreakpointDown(
    "sm",
    css`
      flex-grow: 1;
    `,
  )}
`;

const GuessSubmitterCell = styled(GuessCell)`
  ${mediaBreakpointDown(
    "sm",
    css`
      flex-grow: 1;
    `,
  )}
`;

const GuessDirectionCell = styled(GuessCell)`
  ${mediaBreakpointDown(
    "sm",
    css`
      display: none;
    `,
  )}
`;

const GuessConfidenceCell = styled(GuessCell)`
  ${mediaBreakpointDown(
    "sm",
    css`
      display: none;
    `,
  )}
`;

const AdditionalNotesCell = styled(GuessCell)`
  grid-column: 1 / -1;
  overflow-wrap: break-word;
  ${mediaBreakpointDown(
    "sm",
    css`
      order: 1;
    `,
  )}
`;

const StyledCopyToClipboardButton = styled(CopyToClipboardButton)`
  padding: 0;
  vertical-align: baseline;
`;

const MinimizeChatButton = styled.button<{
  $left: number;
  $isMinimized: boolean;
}>`
  position: absolute;
  top: 50%;
  left: ${({ $left }) => $left}px;
  transform: translate(-50%, -50%);
  z-index: 10;
  background-color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.text};
  border-left: none;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  padding: 8px 4px;
  cursor: pointer;
  height: 40px;

  ${({ $isMinimized }) =>
    $isMinimized &&
    css`
      left: 1px;
      transform: translateY(-50%);
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    `}
`;

const TickerToast = styled(Toast)`
  && {
    border-left: 5px solid #007bff;
    overflow: hidden;
    width: 350px;
    pointer-events: auto;
    position: relative;
  }

  .toast-body {
    position: relative;
    z-index: 1;
    background: transparent !important;
  }
`;

const TickerToastBody = styled(Toast.Body)`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TickerToastContent = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TickerProgress = styled(ProgressBar)`
  position: absolute;
  inset: 0;
  height: auto;
  border-radius: 0;
  z-index: 0;
  opacity: 0.1;

  .progress-bar {
    transition: none;
    background-color: #007bff;
  }
`;

const ManagedTickerToast: FC<{
  msg: TickerToastType;
  dismiss: (id: string) => void;
  onRestore: (e: React.MouseEvent) => void;
}> = ({ msg, dismiss, onRestore }) => {
  const [remaining, setRemaining] = useState(msg.duration);
  const paused = useRef(false);
  const lastTick = useRef<number>(Date.now());
  const rafId = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = Date.now();
    const isPageVisible = document.visibilityState === "visible";
    if (!paused.current && isPageVisible) {
      const delta = now - lastTick.current;
      setRemaining((prev) => Math.max(0, prev - delta));
    }
    lastTick.current = now;
    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      dismiss(msg.id);
    }
  }, [remaining, dismiss, msg.id]);

  useEffect(() => {
    lastTick.current = Date.now();
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [tick]);

  const handleMouseEnter = () => {
    paused.current = true;
  };

  const handleMouseLeave = () => {
    lastTick.current = Date.now();
    paused.current = false;
  };

  return (
    <TickerToast
      onClose={() => dismiss(msg.id)}
      show
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => dismiss(msg.id)}
    >
      <TickerProgress now={(remaining / msg.duration) * 100} />
      <TickerToastBody>
        <TickerToastContent>
          <strong>{msg.sender}:</strong> {msg.text}
        </TickerToastContent>
        <Button
          variant="primary"
          size="sm"
          onClick={onRestore}
          title="Restore Chat"
        >
          <FontAwesomeIcon icon={faComments} size="sm" />
        </Button>
      </TickerToastBody>
    </TickerToast>
  );
};

const TickerContainer = styled(ToastContainer)`
  z-index: 9999;
  position: fixed;
  bottom: 20px;
  left: 20px;
`;

type TickerToastType = {
  id: string;
  text: string;
  sender: string;
  duration: number;
};

const getPlainTextMessage = (
  content: any,
  displayNames?: Map<string, string>,
) => {
  return content.children
    .map((child: any) => {
      if (nodeIsText(child)) return child.text;
      if (nodeIsMention(child)) {
        const name = displayNames?.get(child.userId) ?? "???";
        return `@${name}`;
      }
      if (nodeIsRoleMention(child)) return "@operator";
      if (nodeIsImage(child)) return "🖼";
      return "";
    })
    .join("");
};

enum PuzzleGuessSubmitState {
  IDLE = "idle",
  FAILED = "failed",
}

type PuzzleGuessModalHandle = {
  show: () => void;
};

const PuzzleGuessModal = React.forwardRef(
  (
    {
      puzzle,
      guesses,
      displayNames,
    }: {
      puzzle: PuzzleType;
      guesses: GuessType[];
      displayNames: Map<string, string>;
    },
    forwardedRef: React.Ref<PuzzleGuessModalHandle>,
  ) => {
    const [guessInput, setGuessInput] = useState<string>("");
    const [directionInput, setDirectionInput] = useState<number>(10);
    const [haveSetDirection, setHaveSetDirection] = useState<boolean>(true);
    const [confidenceInput, setConfidenceInput] = useState<number>(100);
    const [haveSetConfidence, setHaveSetConfidence] = useState<boolean>(true);
    const [confirmingSubmit, setConfirmingSubmit] = useState<boolean>(false);
    const [confirmationMessage, setConfirmationMessage] = useState<string>("");
    const [submitState, setSubmitState] = useState<PuzzleGuessSubmitState>(
      PuzzleGuessSubmitState.IDLE,
    );
    const [submitError, setSubmitError] = useState<string>("");
    const formRef = useRef<React.ElementRef<typeof ModalForm>>(null);

    useImperativeHandle(forwardedRef, () => ({
      show: () => {
        if (formRef.current) {
          formRef.current.show();
        }
      },
    }));

    const onGuessInputChange: NonNullable<FormControlProps["onChange"]> =
      useCallback((event) => {
        setGuessInput(event.currentTarget.value.toUpperCase());
        setConfirmingSubmit(false);
      }, []);

    const onDirectionInputChange: NonNullable<FormControlProps["onChange"]> =
      useCallback((val) => {
        setHaveSetDirection(true);
        setDirectionInput(parseInt(val, 10));
      }, []);

    const onConfidenceInputChange: NonNullable<FormControlProps["onChange"]> =
      useCallback((val) => {
        setHaveSetConfidence(true);
        setConfidenceInput(parseInt(val, 10));
      }, []);

    const solvedness = useMemo(() => {
      return computeSolvedness(puzzle);
    }, [puzzle]);

    const onSubmitGuess = useCallback(() => {
      const strippedGuess = guessInput.replaceAll(/\s/g, "");
      const repeatGuess = guesses.find((g) => {
        return g.guess.replaceAll(/\s/g, "") === strippedGuess;
      });
      if ((repeatGuess || solvedness !== "unsolved") && !confirmingSubmit) {
        const repeatGuessStr = repeatGuess
          ? "This answer has already been submitted. "
          : "";
        const solvednessStr = {
          solved: "This puzzle has already been solved. ",
          noAnswers:
            "This puzzle does not expect any answers to be submitted. ",
          unsolved: "",
        }[solvedness];
        const msg = `${solvednessStr} ${repeatGuessStr} Are you sure you want to submit this guess?`;
        setConfirmationMessage(msg);
        setConfirmingSubmit(true);
      } else if (!haveSetDirection || !haveSetConfidence) {
        setSubmitError("Please set a direction and confidence for your guess.");
        setSubmitState(PuzzleGuessSubmitState.FAILED);
      } else {
        createGuess.call(
          {
            puzzleId: puzzle._id,
            guess: guessInput,
            direction: directionInput,
            confidence: confidenceInput,
          },
          (error) => {
            if (error) {
              setSubmitError(error.message);
              setSubmitState(PuzzleGuessSubmitState.FAILED);
            } else {
              // Clear the input box.
              setGuessInput("");
              setHaveSetConfidence(true);
              setConfidenceInput(100);
              setHaveSetDirection(true);
              setDirectionInput(10);
              setSubmitError("");
              setSubmitState(PuzzleGuessSubmitState.IDLE);
              formRef.current.hide();
            }
            setConfirmingSubmit(false);
          },
        );
      }
    }, [
      guesses,
      puzzle._id,
      solvedness,
      guessInput,
      directionInput,
      confidenceInput,
      confirmingSubmit,
      haveSetDirection,
      haveSetConfidence,
    ]);

    const idPrefix = useId();

    const clearError = useCallback(() => {
      setSubmitState(PuzzleGuessSubmitState.IDLE);
    }, []);

    const title = {
      unsolved: `Submit answer to ${puzzle.title}`,
      solved: `Guess history for ${puzzle.title}`,
      noAnswers: `Guess history for ${puzzle.title}`,
    }[solvedness];

    const huntId = useParams<"huntId">().huntId!;
    const hunt = useTracker(() => Hunts.findOne(huntId), [huntId]);
    const canUpdate = useTracker(
      () => userMayUpdateGuessesForHunt(Meteor.user(), hunt),
      [hunt],
    );
    const [operatorActionsHidden] = useOperatorActionsHiddenForHunt(huntId);

    return (
      <ModalForm
        ref={formRef}
        title={title}
        onSubmit={onSubmitGuess}
        submitLabel={confirmingSubmit ? "Confirm Submit" : "Submit"}
        size="lg"
      >
        <FormGroup as={Row} className="mb-3" controlId={`${idPrefix}-guess`}>
          <FormLabel column xs={3}>
            Guess
          </FormLabel>
          <Col xs={9}>
            <AnswerFormControl
              type="text"
              autoFocus
              autoComplete="off"
              onChange={onGuessInputChange}
              value={guessInput}
              disabled={puzzle.deleted}
            />
          </Col>
        </FormGroup>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-guess-direction`}
        >
          <FormLabel column xs={3}>
            Solve direction
          </FormLabel>
          <Col xs={9}>
            <ValidatedSliderContainer>
              <ToggleButtonGroup
                name="solve-dir"
                onChange={onDirectionInputChange}
                defaultValue={10}
              >
                <ToggleButton
                  variant="outline-secondary"
                  value={-10}
                  id={`${idPrefix}-guess-direction-back`}
                  checked={directionInput === -10}
                >
                  Backsolve
                </ToggleButton>
                <ToggleButton
                  variant="outline-secondary"
                  value={-5}
                  id={`${idPrefix}-guess-direction-mostly-back`}
                  checked={directionInput === -5}
                >
                  Mostly back
                </ToggleButton>
                <ToggleButton
                  variant="outline-secondary"
                  value={0}
                  id={`${idPrefix}-guess-direction-mixed`}
                  checked={directionInput === 0}
                >
                  Mixed
                </ToggleButton>
                <ToggleButton
                  variant="outline-secondary"
                  value={5}
                  id={`${idPrefix}-guess-direction-mostly-forward`}
                  checked={directionInput === 5}
                >
                  Mostly forward
                </ToggleButton>
                <ToggleButton
                  variant="outline-primary"
                  value={10}
                  id={`${idPrefix}-guess-direction-forward`}
                  checked={directionInput === 10}
                >
                  Forwardsolve
                </ToggleButton>
              </ToggleButtonGroup>
            </ValidatedSliderContainer>
            <FormText>Select the direction of your solve.</FormText>
          </Col>
        </FormGroup>

        <FormGroup as={Row} className="mb-3">
          <FormLabel column xs={3} htmlFor="jr-puzzle-guess-confidence">
            Confidence {haveSetConfidence}
          </FormLabel>
          <Col xs={9}>
            <ValidatedSliderContainer>
              <ToggleButtonGroup
                name="guess-confidence"
                onChange={onConfidenceInputChange}
                defaultValue={100}
              >
                <ToggleButton
                  variant="outline-danger"
                  value={0}
                  id={`${idPrefix}-guess-confidence-low`}
                  checked={confidenceInput === 0}
                >
                  Low
                </ToggleButton>
                <ToggleButton
                  variant="outline-warning"
                  value={50}
                  id={`${idPrefix}-guess-confidence-medium`}
                  checked={confidenceInput === 50}
                >
                  Medium
                </ToggleButton>
                <ToggleButton
                  variant="outline-success"
                  value={100}
                  id={`${idPrefix}-guess-confidence-high`}
                  checked={confidenceInput === 100}
                >
                  High
                </ToggleButton>
              </ToggleButtonGroup>
            </ValidatedSliderContainer>
            <FormText>Tell us how confident you are about your guess.</FormText>
          </Col>
        </FormGroup>

        {guesses.length === 0 ? (
          <div>No previous submissions.</div>
        ) : (
          [
            <div key="label">Previous submissions</div>,
            <GuessTable key="table">
              {sortedBy(guesses, (g) => g.createdAt)
                .reverse()
                .map((guess) => {
                  const guessDirectionLabel =
                    guess.direction > 5
                      ? "Forward"
                      : guess.direction > 0
                        ? "Forward*"
                        : guess.direction < -5
                          ? "Back"
                          : guess.direction < 0
                            ? "Back*"
                            : "Mixed";
                  const guessDirectionVariant =
                    guess.direction > 5
                      ? "primary"
                      : guess.direction > 0
                        ? "primary"
                        : guess.direction < -5
                          ? "danger"
                          : guess.direction < 0
                            ? "danger"
                            : "secondary";
                  return (
                    <GuessRow $state={guess.state} key={guess._id}>
                      <GuessTableSmallRow>
                        <GuessCell>
                          <GuessState state={guess.state} short />
                        </GuessCell>
                        <GuessAnswerCell>
                          <StyledCopyToClipboardButton
                            variant="link"
                            aria-label="Copy"
                            text={guess.guess}
                          >
                            <FontAwesomeIcon icon={faCopy} fixedWidth />
                          </StyledCopyToClipboardButton>
                          <PuzzleAnswer
                            answer={guess.guess}
                            breakable
                            indented
                          />
                        </GuessAnswerCell>
                      </GuessTableSmallRow>
                      <GuessTimestampCell>
                        {calendarTimeFormat(guess.createdAt)}
                      </GuessTimestampCell>
                      <GuessSubmitterCell>
                        <Breakable>
                          {displayNames.get(guess.createdBy) ?? "???"}
                        </Breakable>
                      </GuessSubmitterCell>
                      <GuessDirectionCell>
                        <Badge bg={guessDirectionVariant}>
                          {guessDirectionLabel}
                        </Badge>

                        {/* <GuessDirection
                          id={`guess-${guess._id}-direction`}
                          value={guess.direction}
                        /> */}
                      </GuessDirectionCell>
                      <GuessConfidenceCell>
                        {guess.confidence > 50 ? (
                          <Badge pill bg="success">
                            High
                          </Badge>
                        ) : guess.confidence < 50 ? (
                          <Badge pill bg="danger">
                            Low
                          </Badge>
                        ) : (
                          <Badge pill bg="warning">
                            Medium
                          </Badge>
                        )}
                      </GuessConfidenceCell>
                      <GuessTableSmallRow>
                        {guess.additionalNotes && (
                          <Markdown
                            as={AdditionalNotesCell}
                            text={guess.additionalNotes}
                          />
                        )}
                      </GuessTableSmallRow>
                    </GuessRow>
                  );
                })}
            </GuessTable>,
            canUpdate ? (
              <>
                <br key={`${idPrefix}-br`} />
                <Alert variant="info" key={`${idPrefix}-deputy-warning`}>
                  To mark answers correct or incorrect, use the popup alerts.
                  {operatorActionsHidden ? (
                    <>
                      {" "}
                      To see alerts, turn on Deputy View: open the profile menu
                      in the top-right, and choose "Switch to Deputy".
                    </>
                  ) : (
                    <> If you've dismissed them, simply reload the page.</>
                  )}
                </Alert>
              </>
            ) : null,
          ]
        )}
        {confirmingSubmit ? (
          <Alert variant="warning">{confirmationMessage}</Alert>
        ) : null}
        {submitState === PuzzleGuessSubmitState.FAILED ? (
          <Alert variant="danger" dismissible onClose={clearError}>
            {submitError}
          </Alert>
        ) : null}
      </ModalForm>
    );
  },
);

enum PuzzleAnswerSubmitState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  FAILED = "failed",
}

type PuzzleAnswerModalHandle = {
  show: () => void;
};

const PuzzleAnswerModal = React.forwardRef(
  (
    {
      puzzle,
      guesses,
    }: {
      puzzle: PuzzleType;
      guesses: GuessType[];
    },
    forwardedRef: React.Ref<PuzzleAnswerModalHandle>,
  ) => {
    const [answer, setAnswer] = useState<string>("");
    const [confirmingSubmit, setConfirmingSubmit] = useState<boolean>(false);
    const [confirmationMessage, setConfirmationMessage] = useState<string>("");
    const [submitState, setSubmitState] = useState<PuzzleAnswerSubmitState>(
      PuzzleAnswerSubmitState.IDLE,
    );
    const [submitError, setSubmitError] = useState<string>("");

    const formRef = useRef<ModalFormHandle>(null);

    const show = useCallback(() => {
      if (formRef.current) {
        formRef.current.show();
      }
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      show,
    }));

    const hide = useCallback(() => {
      if (formRef.current) {
        formRef.current.hide();
      }
    }, []);

    const onAnswerChange: NonNullable<FormControlProps["onChange"]> =
      useCallback((e) => {
        setAnswer(e.currentTarget.value.toUpperCase());
        setConfirmingSubmit(false);
      }, []);

    const onDismissError = useCallback(() => {
      setSubmitState(PuzzleAnswerSubmitState.IDLE);
      setSubmitError("");
    }, []);

    const solvedness = useMemo(() => {
      return computeSolvedness(puzzle);
    }, [puzzle]);

    const onSubmit = useCallback(() => {
      const strippedAnswer = answer.replaceAll(/\s/g, "");
      const repeatAnswer = guesses.find((g) => {
        return (
          g.state === "correct" &&
          g.guess.replaceAll(/\s/g, "") === strippedAnswer
        );
      });
      if ((repeatAnswer || solvedness !== "unsolved") && !confirmingSubmit) {
        const repeatAnswerStr = repeatAnswer
          ? "This answer has already been submitted. "
          : "";
        const solvednessStr = {
          solved: "This puzzle has already been solved. ",
          noAnswers:
            "This puzzle does not expect any answers to be submitted. ",
          unsolved: "",
        }[solvedness];
        const msg = `${solvednessStr} ${repeatAnswerStr} Are you sure you want to submit this answer?`;
        setConfirmationMessage(msg);
        setConfirmingSubmit(true);
        return;
      }
      setSubmitState(PuzzleAnswerSubmitState.SUBMITTING);
      setSubmitError("");
      addPuzzleAnswer.call(
        {
          puzzleId: puzzle._id,
          answer,
        },
        (error) => {
          if (error) {
            setSubmitError(error.message);
            setSubmitState(PuzzleAnswerSubmitState.FAILED);
          } else {
            setAnswer("");
            setSubmitState(PuzzleAnswerSubmitState.IDLE);
            hide();
          }
          setConfirmingSubmit(false);
        },
      );
    }, [puzzle._id, confirmingSubmit, guesses, solvedness, answer, hide]);

    const idPrefix = useId();

    return (
      <ModalForm
        ref={formRef}
        title={`Submit answer to ${puzzle.title}`}
        onSubmit={onSubmit}
        submitLabel={confirmingSubmit ? "Confirm Submit" : "Submit"}
      >
        <FormGroup as={Row} className="mb-3" controlId={`${idPrefix}-answer`}>
          <FormLabel column xs={3}>
            Answer
          </FormLabel>
          <Col xs={9}>
            <AnswerFormControl
              type="text"
              id={`${idPrefix}-answer`}
              autoFocus
              autoComplete="off"
              onChange={onAnswerChange}
              value={answer}
            />
          </Col>
        </FormGroup>

        {confirmingSubmit ? (
          <Alert variant="warning">{confirmationMessage}</Alert>
        ) : null}
        {submitState === PuzzleAnswerSubmitState.FAILED ? (
          <Alert variant="danger" dismissible onClose={onDismissError}>
            {submitError ||
              "Something went wrong. Try again, or contact an admin?"}
          </Alert>
        ) : undefined}
      </ModalForm>
    );
  },
);

const PuzzleDocumentDiv = styled.div`
  width: 100%;
  height: 100%;
  flex: auto;
  position: relative;
  z-index: 1;
`;

const PuzzlePageMultiplayerDocument = React.memo(
  ({
    document,
    selfUser,
  }: {
    document?: DocumentType;
    selfUser: Meteor.User;
  }) => {
    let inner = (
      <DocumentMessage>
        Attempting to load collaborative document...
      </DocumentMessage>
    );
    if (document) {
      inner = (
        <DocumentDisplay
          document={document}
          displayMode="embed"
          user={selfUser}
        />
      );
    }

    return <PuzzleDocumentDiv>{inner}</PuzzleDocumentDiv>;
  },
);

const PuzzleDeletedModal = ({
  puzzleId,
  huntId,
  replacedBy,
}: {
  puzzleId: string;
  huntId: string;
  replacedBy?: string;
}) => {
  const canUpdate = useTracker(
    () => userMayWritePuzzlesForHunt(Meteor.user(), Hunts.findOne(huntId)),
    [huntId],
  );

  const replacement = useTracker(
    () => Puzzles.findOneAllowingDeleted(replacedBy),
    [replacedBy],
  );

  const [show, setShow] = useState(true);
  const hide = useCallback(() => setShow(false), []);

  const undelete = useCallback(() => {
    undestroyPuzzle.call({ puzzleId });
    hide();
  }, [puzzleId, hide]);

  const modal = (
    <Modal show={show} onHide={hide} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>This Jolly Roger entry has been removed</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          An operator has deleted this puzzle from Jolly Roger. You can still
          view it to extract information, but you won&apos;t be able to edit the
          shared document or send new chat messages going forward.
        </p>
        <p>
          We want to make sure this page doesn&apos;t distract folks on the team
          going forward, so there are no links back to this page. If you need to
          save any information, make sure to hold onto the URL until you&apos;re
          done.
        </p>
        {replacedBy && (
          <p>
            This puzzle has been replaced by{" "}
            <Link to={`/hunts/${huntId}/puzzles/${replacedBy}`}>
              {replacement?.title ?? "Another puzzle"}
            </Link>
            .
          </p>
        )}
        {canUpdate && (
          <>
            <p>As an operator, you can un-delete this puzzle:</p>
            <Button variant="primary" onClick={undelete}>
              Undelete
            </Button>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={hide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );

  return createPortal(modal, document.body);
};

const PuzzlePage = React.memo(() => {
  const puzzlePageDivRef = useRef<HTMLDivElement | null>(null);
  const chatSectionRef = useRef<ChatSectionHandle | null>(null);
  const restoreButtonRef =
    useRef<ReactElement<typeof PuzzleMetadataFloatingButton>>(null);
  const [persistentWidth, setPersistentWidth] = usePersistedSidebarWidth();
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState<number>(0);
  const [secondaryDocumentIndex, setSecondaryDocumentIndex] = useState<
    number | null
  >(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    persistentWidth ?? DefaultSidebarWidth,
  );
  const [splitDirection, setSplitDirection] = useState<
    "vertical" | "horizontal"
  >("vertical");
  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);
  const [lastSidebarWidth, setLastSidebarWidth] =
    useState<number>(DefaultSidebarWidth);
  const [isMetadataMinimized, setIsMetadataMinimized] =
    useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    window.innerWidth >= MinimumDesktopWidth,
  );
  const [hasIframeBeenLoaded, setHasIframeBeenLoaded] = useState(false);
  const [replyingTo, setMsgReplyingTo] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState<boolean>(true);
  const [showHighlights, setShowHighlights] = useState(false);
  const setReplyingTo = (messageId: string | null) => {
    setMsgReplyingTo(messageId);
    if (messageId !== null) {
      chatSectionRef.current?.focus();
    }
  };
  const [tickerQueue, setTickerQueue] = useState<TickerToastType[]>([]);

  const prevIsChatMinimized = useRef(isChatMinimized);

  const docRef = useRef<DocumentType | undefined>(undefined);

  const huntId = useParams<"huntId">().huntId!;
  const puzzleId = useParams<"puzzleId">().puzzleId!;

  const [isVisible, setIsVisible] = useState(document.visibilityState);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Add the current user to the collection of people viewing this puzzle.
  const subscribersTopic = `puzzle:${puzzleId}`;
  useSubscribe("subscribers.inc", subscribersTopic, {
    puzzle: puzzleId,
    hunt: huntId,
    visible: isVisible,
  });

  // Get the _list_ of subscribers to this puzzle and the _count_ of subscribers
  // for all puzzles (it's OK if the latter trickles in)
  const subscribersLoading = useSubscribe(
    "subscribers.fetch",
    subscribersTopic,
  );
  useSubscribe("subscribers.counts", { hunt: huntId });

  const displayNamesLoading = useSubscribeDisplayNames(huntId);

  const puzzleLoading = useTypedSubscribe(puzzleForPuzzlePage, {
    puzzleId,
    huntId,
  });

  const chatMessagesLoading = useTypedSubscribe(chatMessagesForPuzzle, {
    puzzleId,
    huntId,
  });

  // There are some model dependencies that we have to be careful about:
  //
  // * We show the displayname of the person who submitted a guess, so guesses
  //   depends on display names
  // * Chat messages show the displayname of the sender, so chatmessages depends
  //   on display names, and we need to know if the puzzle has been deleted to
  //   block new messages
  // * Puzzle metadata needs puzzles, tags, guesses, documents, and display
  //   names.
  //
  // We can render some things on incomplete data, but most of them really need
  // full data:
  // * Chat can be rendered with chat messages and display names and whether we
  //   should disable chat/voice because the puzzle is deleted (but we can
  //   assume it's deleted until the puzzle loads)
  // * Puzzle metadata needs puzzles, tags, documents, guesses, and display
  //   names
  const puzzleDataLoading =
    puzzleLoading() || subscribersLoading() || displayNamesLoading();
  const chatDataLoading = chatMessagesLoading() || displayNamesLoading();

  const displayNames = useTracker(
    () =>
      puzzleDataLoading && chatDataLoading
        ? new Map<string, string>()
        : indexedDisplayNames(),
    [puzzleDataLoading, chatDataLoading],
  );

  const chatMessages: FilteredChatMessageType[] = useTracker(() => {
    return chatDataLoading
      ? []
      : ChatMessages.find(
          { puzzle: puzzleId },
          { sort: { timestamp: 1 } },
        ).fetch();
  }, [puzzleId, chatDataLoading]);
  const prevMessagesLength = useRef<number>(chatMessages.length);

  useEffect(() => {
    if (chatMessages.length > prevMessagesLength.current) {
      const newCount = chatMessages.length - prevMessagesLength.current;
      const newMessages = chatMessages.slice(-newCount);

      if (isChatMinimized) {
        newMessages.forEach((msg) => {
          if (msg.sender) {
            const text = getPlainTextMessage(msg.content, displayNames);
            const senderName = displayNames.get(msg.sender) ?? "???";
            const duration = Math.max(
              3000,
              Math.min(10000, (text.length / 20) * 1000),
            );

            setTickerQueue((prev) => [
              ...prev,
              { id: msg._id, text, sender: senderName, duration },
            ]);
          }
        });
      }
    }

    prevMessagesLength.current = chatMessages.length;
  }, [chatMessages, isChatMinimized, displayNames]);

  const dismissTickerMessage = (id: string) => {
    setTickerQueue((prev) => prev.filter((m) => m.id !== id));
  };

  const handleRestoreFromTicker = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsChatMinimized(false);
      setTickerQueue([]);
      setSidebarWidth(lastSidebarWidth);
      setTimeout(() => {
        if (chatSectionRef.current) {
          setTimeout(() => {
            chatSectionRef.current?.scrollHistoryToTarget();
            chatSectionRef.current.snapToBottom();
          }, 100);
        }
      }, 0);
    },
    [lastSidebarWidth],
  );

  const puzzlesSubscribe = useTypedSubscribe(puzzlesForHunt, { huntId });
  const puzzlesLoading = puzzlesSubscribe();
  const puzzles = useTracker(() => {
    return puzzlesLoading ? [] : Puzzles.find({ hunt: huntId }).fetch();
  }, [puzzlesLoading, huntId]);

  // Sort by created at so that the "first" document always has consistent meaning

  const allDocs = useTracker(
    () =>
      puzzleDataLoading
        ? undefined
        : Documents.find(
            { puzzle: puzzleId },
            { sort: { createdAt: 1 } },
          ).fetch(),
    [puzzleDataLoading, puzzleId],
  );

  const doc = useTracker(() => {
    if (puzzleDataLoading || !allDocs) {
      return undefined;
    }
    return allDocs[selectedDocumentIndex];
  }, [puzzleDataLoading, allDocs, selectedDocumentIndex]);

  const activePuzzle = useTracker(
    () => Puzzles.findOneAllowingDeleted(puzzleId),
    [puzzleId],
  );
  const bookmarked = useTracker(
    () => !!Bookmarks.findOne({ puzzle: puzzleId, user: Meteor.userId()! }),
    [puzzleId],
  );

  const selfUser = useTracker(() => Meteor.user()!, []);

  const puzzleTitle = activePuzzle
    ? `${activePuzzle.title}${activePuzzle.deleted ? " (deleted)" : ""}`
    : "(no such puzzle)";
  const title = puzzleDataLoading ? "loading..." : puzzleTitle;
  useBreadcrumb({
    title,
    path: `/hunts/${huntId}/puzzles/${puzzleId}`,
  });

  const documentTitle = `${title} :: Jolly Roger`;
  useDocumentTitle(documentTitle);

  const [callState, dispatch] = useCallState({ huntId, puzzleId, tabId });

  const onResize = useCallback(() => {
    setIsDesktop(window.innerWidth >= MinimumDesktopWidth);
    trace("PuzzlePage onResize", { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, []);

  const onCommitSideBarSize = useCallback(
    (newSidebarWidth: number) => {
      setPersistentWidth(newSidebarWidth);
      if (!isChatMinimized) {
        if (newSidebarWidth > 0) {
          setTickerQueue([]);
          setSidebarWidth(newSidebarWidth);
          setLastSidebarWidth(newSidebarWidth);
        } else {
          setIsChatMinimized(true);
        }
      }
    },
    [isChatMinimized, setPersistentWidth],
  );

  const toggleChatMinimize = useCallback(() => {
    setIsChatMinimized((prevMinimized) => {
      const nextMinimized = !prevMinimized;
      trace(nextMinimized);
      if (nextMinimized) {
        if (sidebarWidth > 0) {
          setLastSidebarWidth(sidebarWidth);
        }
      } else {
        setTickerQueue([]);
        setSidebarWidth(lastSidebarWidth);
        setTimeout(() => {
          if (chatSectionRef.current) {
            chatSectionRef.current.scrollHistoryToTarget();
          }
        }, 0);
      }
      return nextMinimized;
    });
  }, [sidebarWidth, lastSidebarWidth]);

  const [pulsingMessageId, setPulsingMessageId] = useState<string | null>(null);

  const handleHighlightMessageClick = useCallback((messageId: string) => {
    setShowHighlights(false);
    setTimeout(() => {
      chatSectionRef.current?.scrollToMessage(messageId, () => {
        setPulsingMessageId(messageId);
      });
    }, 100);
  }, []);

  const handleClose = useCallback(() => setShowHighlights(false), []);
  const handleOpen = useCallback(() => setShowHighlights(true), []);

  const onChangeSideBarSize = useCallback(
    (newSize: number) => {
      if (!isChatMinimized) {
        setSidebarWidth(newSize);
      }
      trace("PuzzlePage onChangeSideBarSize", {
        hasRef: !!chatSectionRef.current,
      });
      if (chatSectionRef.current) {
        chatSectionRef.current.scrollHistoryToTarget();
      }
    },
    [isChatMinimized],
  );

  const toggleMetadata = useCallback(() => {
    setIsMetadataMinimized((prev) => !prev);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies(sidebarWidth): When the sidebar width changes, we want to scroll to the target.
  useLayoutEffect(() => {
    trace("PuzzlePage useLayoutEffect", { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, [sidebarWidth]);

  useEffect(() => {
    // Populate sidebar width on mount
    setSidebarWidth(
      Math.min(
        sidebarWidth,
        puzzlePageDivRef.current.clientWidth - MinimumDocumentWidth,
      ),
    );

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [onResize, sidebarWidth]);

  useEffect(() => {
    prevIsChatMinimized.current = isChatMinimized;
  });

  useEffect(() => {
    const justRestored = !isChatMinimized && prevIsChatMinimized.current;

    if (justRestored) {
      const animationFrameId = requestAnimationFrame(() => {
        if (chatSectionRef.current) {
          chatSectionRef.current.scrollHistoryToTarget();
          chatSectionRef.current.snapToBottom();
        }
      });

      return () => cancelAnimationFrame(animationFrameId);
    }
    return;
  }, [isChatMinimized]);

  useEffect(() => {
    if (!isChatMinimized) {
      const timer = setTimeout(() => {
        chatSectionRef.current?.snapToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
    return;
  }, [isChatMinimized]);

  useEffect(() => {
    if (activePuzzle && !activePuzzle.deleted) {
      ensurePuzzleDocument.call({ puzzleId: activePuzzle._id });
    }
  }, [activePuzzle]);

  useEffect(() => {
    if (activePuzzle?.url && !hasIframeBeenLoaded) {
      const iframe = new Image();
      iframe.onload = () => setHasIframeBeenLoaded(true);
      iframe.src = activePuzzle?.url;
    }
    if (doc && !docRef.current) {
      docRef.current = doc;
    }
  }, [activePuzzle?.url, hasIframeBeenLoaded, doc]);

  trace("PuzzlePage render", { puzzleDataLoading, chatDataLoading });

  if (puzzleDataLoading) {
    return (
      <FixedLayout ref={puzzlePageDivRef}>
        <span>loading...</span>
      </FixedLayout>
    );
  }
  if (!activePuzzle) {
    return (
      <FixedLayout ref={puzzlePageDivRef}>
        <span>No puzzle found :( Did you get that URL right?</span>
      </FixedLayout>
    );
  }
  const metadata = (
    <PuzzlePageMetadata
      isMinimized={isMetadataMinimized}
      puzzle={activePuzzle}
      bookmarked={bookmarked}
      document={doc}
      allPuzzles={puzzles}
      displayNames={displayNames}
      isDesktop={isDesktop}
      showDocument={showDocument}
      setShowDocument={setShowDocument}
      hasIframeBeenLoaded={hasIframeBeenLoaded}
      setHasIframeBeenLoaded={setHasIframeBeenLoaded}
      toggleMetadataMinimize={toggleMetadata}
      allDocs={allDocs}
      selectedDocumentIndex={selectedDocumentIndex}
      setSelectedDocument={setSelectedDocumentIndex}
      selectedSecondaryDocument={secondaryDocumentIndex}
      setSecondaryDocument={setSecondaryDocumentIndex}
      splitDirection={splitDirection}
      setSplitDirection={setSplitDirection}
      selfUser={selfUser}
    />
  );

  const effectiveSidebarWidth = isChatMinimized ? 1 : sidebarWidth;

  const chat = (
    <ChatSectionMemo
      ref={chatSectionRef}
      chatDataLoading={chatDataLoading}
      disabled={activePuzzle.deleted ?? true}
      displayNames={displayNames}
      puzzles={puzzles}
      chatMessages={chatMessages}
      huntId={huntId}
      puzzleId={puzzleId}
      callState={callState}
      callDispatch={dispatch}
      selfUser={selfUser}
      pulsingMessageId={pulsingMessageId}
      setPulsingMessageId={setPulsingMessageId}
      replyingTo={replyingTo}
      setReplyingTo={setReplyingTo}
      sidebarWidth={effectiveSidebarWidth}
      showHighlights={showHighlights}
      handleOpen={handleOpen}
      handleClose={handleClose}
      handleHighlightMessageClick={handleHighlightMessageClick}
    />
  );
  const deletedModal = activePuzzle.deleted && (
    <PuzzleDeletedModal
      puzzleId={puzzleId}
      huntId={huntId}
      replacedBy={activePuzzle.replacedBy}
    />
  );

  let debugPane: React.ReactNode | undefined;
  if (DEBUG_SHOW_CALL_STATE) {
    (window as any).globalCallState = callState;
    const peerStreamsForRendering = new Map();
    callState.peerStreams.forEach((stream, peerId) => {
      peerStreamsForRendering.set(
        peerId,
        `active: ${stream.active}, tracks: ${stream.getTracks().length}`,
      );
    });
    const callStateForRendering = {
      ...callState,
      peerStreams: peerStreamsForRendering,
      audioState: {
        mediaSource: callState.audioState?.mediaSource ? "present" : "absent",
        audioContext: callState.audioState?.audioContext ? "present" : "absent",
      },
      device: callState.device ? "present" : "absent",
      transports: {
        recv: callState.transports.recv ? "present" : "absent",
        send: callState.transports.send ? "present" : "absent",
      },
      router: callState.router ? "present" : "absent",
    };
    debugPane = (
      <pre
        style={{
          position: "absolute",
          right: "0",
          bottom: "0",
          fontSize: "12px",
          backgroundColor: "rgba(255,255,255,.7)",
        }}
      >
        {JSON.stringify(callStateForRendering, undefined, 2)}
      </pre>
    );
  }

  const showMetadataButton = isMetadataMinimized ? (
    <OverlayTrigger
      placement="bottom-end"
      overlay={<Tooltip>Show puzzle information</Tooltip>}
    >
      <PuzzleMetadataFloatingButton
        ref={restoreButtonRef}
        variant="secondary"
        size="sm"
        onClick={toggleMetadata}
      >
        <FontAwesomeIcon icon={faAngleDoubleDown} />
      </PuzzleMetadataFloatingButton>
    </OverlayTrigger>
  ) : null;
  const tickerPortal =
    isChatMinimized &&
    tickerQueue.length > 0 &&
    createPortal(
      <TickerContainer position="bottom-start" className="p-3">
        {tickerQueue.length > 1 && (
          <Badge bg="secondary" pill>
            +{tickerQueue.length - 1} more message
            {tickerQueue.length > 2 ? "s" : ""}
          </Badge>
        )}
        {tickerQueue.slice(0, 1).map((msg) => (
          <ManagedTickerToast
            key={msg.id}
            msg={msg}
            dismiss={dismissTickerMessage}
            onRestore={handleRestoreFromTicker}
          />
        ))}
      </TickerContainer>,
      document.body,
    );

  if (isDesktop) {
    return (
      <>
        {deletedModal}
        {tickerPortal}
        <FixedLayout className="puzzle-page" ref={puzzlePageDivRef}>
          {isChatMinimized && (
            <MinimizedChatInfo
              huntId={huntId}
              puzzleId={puzzleId}
              callState={callState}
              callDispatch={dispatch}
              onRestore={toggleChatMinimize}
            />
          )}
          {!isChatMinimized && (
            <OverlayTrigger
              placement="right"
              overlay={<Tooltip>Minimize Chat</Tooltip>}
            >
              <MinimizeChatButton
                $left={effectiveSidebarWidth + 15}
                $isMinimized={false}
                onClick={toggleChatMinimize}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </MinimizeChatButton>
            </OverlayTrigger>
          )}
          <SplitPaneMinus
            split="vertical"
            minSize={isChatMinimized ? 1 : MinimumSidebarWidth}
            maxSize={-MinimumDocumentWidth}
            primary="first"
            size={effectiveSidebarWidth}
            onChanged={onChangeSideBarSize}
            onPaneChanged={onCommitSideBarSize}
            allowResize={!isChatMinimized}
          >
            {chat}
            <PuzzleContent>
              {metadata}
              {showMetadataButton}
              <PuzzleDocumentDiv>
                <PuzzlePageMultiplayerDocument
                  document={doc}
                  showDocument={showDocument}
                  selfUser={selfUser}
                />
              </PuzzleDocumentDiv>
              {debugPane}
            </PuzzleContent>
          </SplitPaneMinus>
        </FixedLayout>
      </>
    );
  }

  // Non-desktop (narrow layout)
  return (
    <>
      {deletedModal}
      <FixedLayout $narrow ref={puzzlePageDivRef}>
        {metadata}
        {chat}
      </FixedLayout>
    </>
  );
});

export default PuzzlePage;
