import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faAngleDoubleDown } from "@fortawesome/free-solid-svg-icons/faAngleDoubleDown";
import { faAngleDoubleUp } from "@fortawesome/free-solid-svg-icons/faAngleDoubleUp";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons/faChevronLeft";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
import { faImage } from "@fortawesome/free-solid-svg-icons/faImage";
import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons/faPaperPlane";
import { faPuzzlePiece } from "@fortawesome/free-solid-svg-icons/faPuzzlePiece";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ComponentPropsWithRef, FC } from "react";
import React, {
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
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Row from "react-bootstrap/Row";
import Tooltip from "react-bootstrap/Tooltip";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import type { Descendant } from "slate";
import styled, { css } from "styled-components";
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
  userMayWritePuzzlesForHunt,
} from "../../lib/permission_stubs";
import chatMessagesForPuzzle from "../../lib/publications/chatMessagesForPuzzle";
import puzzleForPuzzlePage from "../../lib/publications/puzzleForPuzzlePage";
import { computeSolvedness } from "../../lib/solvedness";
import addPuzzleAnswer from "../../methods/addPuzzleAnswer";
import addPuzzleTag from "../../methods/addPuzzleTag";
import createChatImageUpload from "../../methods/createChatImageUpload";
import createGuess from "../../methods/createGuess";
import ensurePuzzleDocument from "../../methods/ensurePuzzleDocument";
import removePuzzleAnswer from "../../methods/removePuzzleAnswer";
import removePuzzleTag from "../../methods/removePuzzleTag";
import sendChatMessage from "../../methods/sendChatMessage";
import undestroyPuzzle from "../../methods/undestroyPuzzle";
import updatePuzzle from "../../methods/updatePuzzle";
import EnabledChatImage from "../EnabledChatImage";
import { useBreadcrumb } from "../hooks/breadcrumb";
import useBlockUpdate from "../hooks/useBlockUpdate";
import type { Action, CallState } from "../hooks/useCallState";
import useCallState from "../hooks/useCallState";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useSubscribeDisplayNames from "../hooks/useSubscribeDisplayNames";
import useTypedSubscribe from "../hooks/useTypedSubscribe";
import indexedDisplayNames from "../indexedDisplayNames";
import { trace } from "../tracing";
import BookmarkButton from "./BookmarkButton";
import ChatMessage from "./ChatMessage";
import ChatPeople from "./ChatPeople";
import CopyToClipboardButton from "./CopyToClipboardButton";
import DocumentDisplay, { DocumentMessage } from "./DocumentDisplay";
import type { FancyEditorHandle, MessageElement } from "./FancyEditor";
import FancyEditor from "./FancyEditor";
import GuessState from "./GuessState";
import {
  formatConfidence,
  formatGuessDirection,
  GuessConfidence,
  GuessDirection,
} from "./guessDetails";
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

type FilteredChatFields =
  | "_id"
  | "hunt"
  | "puzzle"
  | "content"
  | "sender"
  | "timestamp";
type FilteredChatMessageType = Pick<ChatMessageType, FilteredChatFields>;

// It doesn't need to be, but this is consistent with the 576px transition used in other pages' css
const MinimumSidebarWidth = 176;
const MinimumDocumentWidth = 400;
const DefaultSidebarWidth = 300;

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

const ChatHistoryDiv = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;

  /* Nothing should overflow the box, but if you nest blockquotes super deep you
     can do horrible things.  We should still avoid horizontal scroll bars,
     since they make the log harder to read at the bottom. */
  overflow-x: hidden;
`;

const PUZZLE_PAGE_PADDING = 8;

const ChatMessageDiv = styled.div<{
  $isSystemMessage: boolean;
  $isHighlighted: boolean;
}>`
  padding: 0 ${PUZZLE_PAGE_PADDING}px 2px;
  overflow-wrap: break-word;
  font-size: 14px;
  ${({ $isSystemMessage, $isHighlighted }) =>
    $isHighlighted &&
    !$isSystemMessage &&
    css`
      background-color: ${({ theme }) =>
        theme.colors.pinnedChatMessageBackground};
    `}

  ${({ $isSystemMessage }) =>
    $isSystemMessage &&
    css`
      background-color: ${({ theme }) =>
        theme.colors.systemChatMessageBackground};
    `}
`;

const ChatInputRow = styled.div`
  padding: ${PUZZLE_PAGE_PADDING}px;
  padding-bottom: max(
    env(safe-area-inset-bottom, 0px),
    ${PUZZLE_PAGE_PADDING}px
  );
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
`;

const PuzzleMetadata = styled.div`
  flex: none;
  padding: ${PUZZLE_PAGE_PADDING - 2}px 8px;
  border-bottom: 1px solid #dadce0;
  background-color: ${({ theme }) => theme.colors.background};
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
  flex-wrap: nowrap;

  a {
    margin-right: 8px;
  }
`;

const PuzzleMetadataButtons = styled.div`
  margin-left: auto;

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

const ChatHistoryMessage = React.memo(
  ({
    message,
    displayNames,
    isSystemMessage,
    isHighlighted,
    suppressSender,
    selfUserId,
    roles,
    imageOnLoad,
  }: {
    message: FilteredChatMessageType;
    displayNames: Map<string, string>;
    isSystemMessage: boolean;
    isHighlighted: boolean;
    suppressSender: boolean;
    selfUserId: string;
    roles: string[];
    imageOnLoad: () => void;
  }) => {
    const ts = shortCalendarTimeFormat(message.timestamp);

    const senderDisplayName =
      message.sender !== undefined
        ? (displayNames.get(message.sender) ?? "???")
        : "jolly-roger";
    return (
      <ChatMessageDiv
        $isSystemMessage={isSystemMessage}
        $isHighlighted={isHighlighted && !isSystemMessage}
      >
        {!suppressSender && <ChatMessageTimestamp>{ts}</ChatMessageTimestamp>}
        {!suppressSender && <strong>{senderDisplayName}</strong>}
        <ChatMessage
          message={message.content}
          displayNames={displayNames}
          selfUserId={selfUserId}
          roles={roles}
          imageOnLoad={imageOnLoad}
        />
      </ChatMessageDiv>
    );
  },
);

type ChatHistoryHandle = {
  saveScrollBottomTarget: () => void;
  snapToBottom: () => void;
  scrollToTarget: () => void;
};

const ChatHistory = React.forwardRef(
  (
    {
      huntId,
      puzzleId,
      displayNames,
      selfUser,
    }: {
      huntId: string;
      puzzleId: string;
      displayNames: Map<string, string>;
      selfUser: Meteor.User;
    },
    forwardedRef: React.Ref<ChatHistoryHandle>,
  ) => {
    // TODO: consider using useFind once fixed upstream
    const chatMessages: FilteredChatMessageType[] = useTracker(() => {
      return ChatMessages.find(
        { puzzle: puzzleId },
        { sort: { timestamp: 1 } },
      ).fetch();
    }, [puzzleId]);

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

    useImperativeHandle(forwardedRef, () => ({
      saveScrollBottomTarget,
      snapToBottom,
      scrollToTarget,
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

    const scrollChat = useCallback(() => {
      // Whenever we rerender due to new messages arriving, make our
      // distance-from-bottom match the previous one, if it's larger than some
      // small fudge factor.  But if the user has actually scrolled into the backlog,
      // don't move the backlog while they're reading it -- instead, assume they want
      // to see the same messages in the same position, and adapt the target bottom
      // distance instead.
      trace("ChatHistory useLayoutEffect", {
        scrollBottomTarget: scrollBottomTarget.current,
        action: scrollBottomTarget.current > 10 ? "save" : "snap",
        messageCount: chatMessages.length,
      });
      if (scrollBottomTarget.current > 10) {
        saveScrollBottomTarget();
      } else {
        snapToBottom();
      }
    }, [chatMessages.length, saveScrollBottomTarget, snapToBottom]);

    useLayoutEffect(() => {
      scrollChat();
    }, [scrollChat]);

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
          const lastMessage = index > 0 ? messages[index - 1] : undefined;
          const suppressSender =
            !!lastMessage &&
            lastMessage.sender === msg.sender &&
            lastMessage.timestamp.getTime() + 60000 > msg.timestamp.getTime();
          const isHighlighted = messageDingsUser(msg, selfUser);
          return (
            <ChatHistoryMessage
              key={msg._id}
              message={msg}
              displayNames={displayNames}
              isSystemMessage={msg.sender === undefined}
              isHighlighted={isHighlighted}
              suppressSender={suppressSender}
              selfUserId={selfUser._id}
              roles={roles}
              imageOnLoad={scrollChat}
            />
          );
        })}
      </ChatHistoryDiv>
    );
  },
);

// The ESlint prop-types check seems to stumble over prop type checks somehow
// if we put the memo() and forwardRef() on the same line above.
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
  padding: 9px 4px;
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
  ({
    onHeightChange,
    onMessageSent,
    huntId,
    puzzleId,
    disabled,
  }: {
    onHeightChange: () => void;
    onMessageSent: () => void;
    huntId: string;
    puzzleId: string;
    disabled: boolean;
  }) => {
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
                  setUploadImageError(`S3 upload failed: ${uploadErr.message}`);
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

    return (
      <ChatInputRow>
        {uploadImageError && createPortal(errorModal, document.body)}
        <InputGroup>
          <StyledFancyEditor
            ref={fancyEditorRef}
            className="form-control"
            initialContent={content}
            placeholder="Chat"
            users={users}
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
);

interface ChatSectionHandle {
  scrollHistoryToTarget: () => void;
}

const ChatSection = React.forwardRef(
  (
    {
      chatDataLoading,
      disabled,
      displayNames,
      puzzleId,
      huntId,
      callState,
      callDispatch,
      joinCall,
      selfUser,
    }: {
      chatDataLoading: boolean;
      disabled: boolean;
      displayNames: Map<string, string>;
      puzzleId: string;
      huntId: string;
      callState: CallState;
      callDispatch: React.Dispatch<Action>;
      joinCall: () => void;
      selfUser: Meteor.User;
    },
    forwardedRef: React.Ref<ChatSectionHandle>,
  ) => {
    const historyRef = useRef<React.ElementRef<typeof ChatHistoryMemo>>(null);
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
      if (historyRef.current) {
        historyRef.current.snapToBottom();
      }
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      scrollHistoryToTarget,
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
          joinCall={joinCall}
        />
        <ChatHistoryMemo
          ref={historyRef}
          puzzleId={puzzleId}
          displayNames={displayNames}
          selfUser={selfUser}
          huntId={huntId}
        />
        <ChatInput
          huntId={huntId}
          puzzleId={puzzleId}
          disabled={disabled}
          onHeightChange={scrollHistoryToTarget}
          onMessageSent={onMessageSent}
        />
      </ChatSectionDiv>
    );
  },
);
const ChatSectionMemo = React.memo(ChatSection);

const PuzzlePageMetadata = ({
  puzzle,
  bookmarked,
  displayNames,
  document,
  isDesktop,
  selfUser,
  onMinimizeMetadata,
}: {
  puzzle: PuzzleType;
  bookmarked: boolean;
  displayNames: Map<string, string>;
  document?: DocumentType;
  isDesktop: boolean;
  selfUser: Meteor.User;
  onMinimizeMetadata: () => void;
}) => {
  const huntId = puzzle.hunt;
  const puzzleId = puzzle._id;
  const idPrefix = useId();

  const hunt = useTracker(() => Hunts.findOne(huntId), [huntId]);
  const hasGuessQueue = hunt?.hasGuessQueue ?? false;
  const canUpdate = useTracker(
    () => userMayWritePuzzlesForHunt(Meteor.user(), hunt),
    [hunt],
  );

  const allPuzzles = useTracker(
    () => Puzzles.find({ hunt: huntId }).fetch(),
    [huntId],
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
    >
      <FontAwesomeIcon fixedWidth icon={faPuzzlePiece} /> <span>Puzzle</span>
    </PuzzleMetadataExternalLink>
  ) : null;

  const imageInsert = isDesktop &&
    document &&
    document.provider === "google" &&
    document.value.type === "spreadsheet" && (
      <InsertImage documentId={document._id} />
    );

  const documentLink =
    document && !isDesktop ? (
      <DocumentDisplay document={document} displayMode="link" user={selfUser} />
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

  const minimizeMetadataButton = (
    <OverlayTrigger
      placement="bottom"
      overlay={
        <Tooltip id={`${idPrefix}-hide-puzzle-info`}>Hide puzzle info</Tooltip>
      }
    >
      <Button onClick={onMinimizeMetadata} size="sm">
        <FontAwesomeIcon icon={faAngleDoubleUp} />
      </Button>
    </OverlayTrigger>
  );

  return (
    <PuzzleMetadata>
      <PuzzleModalForm
        key={puzzleId}
        ref={editModalRef}
        puzzle={puzzle}
        huntId={huntId}
        tags={allTags}
        onSubmit={onEdit}
      />
      <PuzzleMetadataActionRow>
        <BookmarkButton
          puzzleId={puzzleId}
          bookmarked={bookmarked}
          variant="link"
          size="sm"
        />
        {puzzleLink}
        {documentLink}
        <PuzzleMetadataButtons>
          {editButton}
          {imageInsert}
          {guessButton}
          {minimizeMetadataButton}
        </PuzzleMetadataButtons>
      </PuzzleMetadataActionRow>
      <PuzzleMetadataRow>{answersElement}</PuzzleMetadataRow>
      <PuzzleMetadataRow>
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
      </PuzzleMetadataRow>
    </PuzzleMetadata>
  );
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

const GuessSliderContainer = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
`;
const GuessSliderLeftLabel = styled.div`
  width: 1.5em;
  text-align: right;
`;
const GuessSliderRightLabel = styled.div`
  width: 2.5em;
  text-align: left;
`;
const GuessSlider = styled.input`
  width: 1px;
  flex-grow: 1;
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

const MinimizeChatButton = styled.button`
  position: absolute;
  top: 50%;
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
`;

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
    const [directionInput, setDirectionInput] = useState<number>(0);
    const [haveSetDirection, setHaveSetDirection] = useState<boolean>(false);
    const [confidenceInput, setConfidenceInput] = useState<number>(50);
    const [haveSetConfidence, setHaveSetConfidence] = useState<boolean>(false);
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
      useCallback((event) => {
        setHaveSetDirection(true);
        setDirectionInput(parseInt(event.currentTarget.value, 10));
      }, []);

    const onConfidenceInputChange: NonNullable<FormControlProps["onChange"]> =
      useCallback((event) => {
        setHaveSetConfidence(true);
        setConfidenceInput(parseInt(event.currentTarget.value, 10));
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
              // Clear the input box.  Don't dismiss the dialog.
              setGuessInput("");
              setHaveSetConfidence(false);
              setConfidenceInput(50);
              setHaveSetDirection(false);
              setDirectionInput(0);
              setSubmitError("");
              setSubmitState(PuzzleGuessSubmitState.IDLE);
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

    const directionTooltip = (
      <Tooltip id={`${idPrefix}-direction-tooltip`}>
        <strong>Solve direction:</strong> {formatGuessDirection(directionInput)}
      </Tooltip>
    );
    const confidenceTooltip = (
      <Tooltip id={`${idPrefix}-confidence-tooltip`}>
        <strong>Confidence:</strong> {formatConfidence(confidenceInput)}
      </Tooltip>
    );

    const clearError = useCallback(() => {
      setSubmitState(PuzzleGuessSubmitState.IDLE);
    }, []);

    const title = {
      unsolved: `Submit answer to ${puzzle.title}`,
      solved: `Guess history for ${puzzle.title}`,
      noAnswers: `Guess history for ${puzzle.title}`,
    }[solvedness];

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
              id={`${idPrefix}-guess`}
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
              <OverlayTrigger placement="top" overlay={directionTooltip}>
                <GuessSliderContainer>
                  <GuessSliderLeftLabel>
                    <FontAwesomeIcon icon={faArrowLeft} fixedWidth />
                  </GuessSliderLeftLabel>
                  <GuessSlider
                    id={`${idPrefix}-guess-direction`}
                    type="range"
                    min="-10"
                    max="10"
                    list={`${idPrefix}-guess-direction-list`}
                    onChange={onDirectionInputChange}
                    value={directionInput}
                    disabled={puzzle.deleted}
                  />
                  <datalist id={`${idPrefix}-guess-direction-list`}>
                    <option value="-10">-10</option>
                    <option value="0">0</option>
                    <option value="10">10</option>
                  </datalist>
                  <GuessSliderRightLabel>
                    <FontAwesomeIcon icon={faArrowRight} fixedWidth />
                  </GuessSliderRightLabel>
                </GuessSliderContainer>
              </OverlayTrigger>
              <FontAwesomeIcon
                icon={faCheck}
                color={haveSetDirection ? "green" : "transparent"}
                fixedWidth
              />
            </ValidatedSliderContainer>
            <FormText>
              Pick a number between -10 (backsolved without opening the puzzle)
              to 10 (forward-solved without seeing the round) to indicate if you
              forward- or back-solved.
            </FormText>
          </Col>
        </FormGroup>

        <FormGroup
          as={Row}
          className="mb-3"
          controlId={`${idPrefix}-guess-confidence`}
        >
          <FormLabel column xs={3}>
            Confidence
          </FormLabel>
          <Col xs={9}>
            <ValidatedSliderContainer>
              <OverlayTrigger placement="top" overlay={confidenceTooltip}>
                <GuessSliderContainer>
                  <GuessSliderLeftLabel>0%</GuessSliderLeftLabel>
                  <GuessSlider
                    id={`${idPrefix}-guess-confidence`}
                    type="range"
                    min="0"
                    max="100"
                    list={`${idPrefix}-guess-confidence-list`}
                    onChange={onConfidenceInputChange}
                    value={confidenceInput}
                    disabled={puzzle.deleted}
                  />
                  <datalist id={`${idPrefix}-guess-confidence-list`}>
                    <option value="0">0%</option>
                    <option value="25">25%</option>
                    <option value="50">50%</option>
                    <option value="75">75%</option>
                    <option value="100">100%</option>
                  </datalist>
                  <GuessSliderRightLabel>100%</GuessSliderRightLabel>
                </GuessSliderContainer>
              </OverlayTrigger>
              <FontAwesomeIcon
                icon={faCheck}
                color={haveSetConfidence ? "green" : "transparent"}
                fixedWidth
              />
            </ValidatedSliderContainer>
            <FormText>
              Pick a number between 0 and 100 for the probability that you think
              this answer is right.
            </FormText>
          </Col>
        </FormGroup>

        {guesses.length === 0 ? (
          <div>No previous submissions.</div>
        ) : (
          [
            <div key="label">Previous submissions:</div>,
            <GuessTable key="table">
              {sortedBy(guesses, (g) => g.createdAt)
                .reverse()
                .map((guess) => {
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
                        <GuessDirection
                          id={`${idPrefix}-${guess._id}-direction`}
                          value={guess.direction}
                        />
                      </GuessDirectionCell>
                      <GuessConfidenceCell>
                        <GuessConfidence
                          id={`${idPrefix}-${guess._id}-confidence`}
                          value={guess.confidence}
                        />
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
  const [sidebarWidth, setSidebarWidth] = useState<number>(DefaultSidebarWidth);
  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);
  const [isMetadataMinimized, setIsMetadataMinimized] =
    useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    window.innerWidth >= MinimumDesktopWidth,
  );

  const huntId = useParams<"huntId">().huntId!;
  const puzzleId = useParams<"puzzleId">().puzzleId!;
  const idPrefix = useId();

  // Add the current user to the collection of people viewing this puzzle.
  const subscribersTopic = `puzzle:${puzzleId}`;
  useSubscribe("subscribers.inc", subscribersTopic, {
    puzzle: puzzleId,
    hunt: huntId,
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

  // Sort by created at so that the "first" document always has consistent meaning
  const document = useTracker(
    () =>
      puzzleDataLoading
        ? undefined
        : Documents.findOne({ puzzle: puzzleId }, { sort: { createdAt: 1 } }),
    [puzzleDataLoading, puzzleId],
  );

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

  const {
    state: callState,
    dispatch,
    joinCall,
  } = useCallState({ huntId, puzzleId, tabId });

  const onResize = useCallback(() => {
    setIsDesktop(window.innerWidth >= MinimumDesktopWidth);
    trace("PuzzlePage onResize", { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, []);

  const minimizeChat = useCallback(() => {
    setIsChatMinimized(true);
  }, []);

  const restoreChat = useCallback(() => {
    setIsChatMinimized(false);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies(chatMessages.length): We do want to trigger this effect on chatMessages length change
  useEffect(() => {
    // Any time a new chat message comes in, show the chat again.
    setIsChatMinimized(false);
  }, [chatMessages.length]);

  useEffect(() => {
    // There's no point hiding the chat scrollback at mobile widths; we don't
    // embed the sheet at that size, so we'd just get a blank white area.
    if (!isDesktop) {
      setIsChatMinimized(false);
    }
  }, [isDesktop]);

  const onChangeSideBarSize = useCallback(
    (newSize: number) => {
      // Why only when !isChatMinimized?
      // We'll still get sidebar size change events from SplitPaneMinus when the
      // window size changes. Ignore them, lest we commit the new sidebar size
      // of 0.
      if (!isChatMinimized) {
        setSidebarWidth(newSize);
        trace("PuzzlePage onChangeSideBarSize", {
          hasRef: !!chatSectionRef.current,
          newSize,
        });
        if (chatSectionRef.current) {
          chatSectionRef.current.scrollHistoryToTarget();
        }
      }
    },
    [isChatMinimized],
  );

  const toggleMetadata = useCallback(() => {
    setIsMetadataMinimized((prev) => !prev);
  }, []);

  const answersCount = activePuzzle?.answers?.length ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies(answersCount): We want to force the metadata section to be visible when the answers change, so solvers will not miss the puzzle being solved.
  useEffect(() => {
    setIsMetadataMinimized(false);
  }, [answersCount]);

  // biome-ignore lint/correctness/useExhaustiveDependencies(sidebarWidth): When the sidebar width changes, we want to scroll to the target.
  useLayoutEffect(() => {
    trace("PuzzlePage useLayoutEffect", { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, [sidebarWidth]);

  useEffect(() => {
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [onResize]);

  useLayoutEffect(() => {
    // Adjust sidebar width based on window size on initial mount
    if (puzzlePageDivRef.current) {
      const clientWidth = puzzlePageDivRef.current.clientWidth;
      setSidebarWidth((sidebarWidth) => {
        return Math.min(sidebarWidth, clientWidth - MinimumDocumentWidth);
      });
    }
  }, []);

  useEffect(() => {
    if (activePuzzle && !activePuzzle.deleted) {
      ensurePuzzleDocument.call({ puzzleId: activePuzzle._id });
    }
  }, [activePuzzle]);

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
  const metadata = isMetadataMinimized ? null : (
    <PuzzlePageMetadata
      puzzle={activePuzzle}
      bookmarked={bookmarked}
      document={document}
      displayNames={displayNames}
      isDesktop={isDesktop}
      selfUser={selfUser}
      onMinimizeMetadata={toggleMetadata}
    />
  );

  const effectiveSidebarWidth = isChatMinimized ? 0 : sidebarWidth;

  const chat = isChatMinimized ? null : (
    <ChatSectionMemo
      ref={chatSectionRef}
      chatDataLoading={chatDataLoading}
      disabled={activePuzzle.deleted ?? true /* disable while still loading */}
      displayNames={displayNames}
      huntId={huntId}
      puzzleId={puzzleId}
      callState={callState}
      callDispatch={dispatch}
      joinCall={joinCall}
      selfUser={selfUser}
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
      overlay={
        <Tooltip id={`${idPrefix}-show-puzzle-info`}>Show puzzle info</Tooltip>
      }
    >
      <PuzzleMetadataFloatingButton
        variant="secondary"
        size="sm"
        onClick={toggleMetadata}
      >
        <FontAwesomeIcon icon={faAngleDoubleDown} />
      </PuzzleMetadataFloatingButton>
    </OverlayTrigger>
  ) : null;
  if (isDesktop) {
    return (
      <>
        {deletedModal}
        <FixedLayout ref={puzzlePageDivRef}>
          {isChatMinimized ? (
            <MinimizedChatInfo
              huntId={huntId}
              puzzleId={puzzleId}
              callState={callState}
              callDispatch={dispatch}
              joinCall={joinCall}
              onRestore={restoreChat}
            />
          ) : (
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip id={`${idPrefix}-hide-chat`}>Minimize chat</Tooltip>
              }
            >
              <MinimizeChatButton
                style={{ left: `${isChatMinimized ? 1 : sidebarWidth + 15}px` }}
                onClick={minimizeChat}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </MinimizeChatButton>
            </OverlayTrigger>
          )}
          <SplitPaneMinus
            split="vertical"
            minSize={isChatMinimized ? 0 : MinimumSidebarWidth}
            maxSize={-MinimumDocumentWidth}
            primary="first"
            size={effectiveSidebarWidth}
            onChanged={onChangeSideBarSize}
            allowResize={!isChatMinimized}
          >
            {chat}
            <PuzzleContent>
              {metadata}
              {showMetadataButton}
              <PuzzlePageMultiplayerDocument
                document={document}
                selfUser={selfUser}
              />
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
      <FixedLayout $narrow>
        {metadata}
        {showMetadataButton}
        {chat}
      </FixedLayout>
    </>
  );
});

export default PuzzlePage;
