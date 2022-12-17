/* eslint-disable max-len, no-console */
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faKey } from '@fortawesome/free-solid-svg-icons/faKey';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons/faPaperPlane';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import FormText from 'react-bootstrap/FormText';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';
import { Link, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import styled, { css } from 'styled-components';
import Ansible from '../../Ansible';
import { calendarTimeFormat, shortCalendarTimeFormat } from '../../lib/calendarTimeFormat';
import { indexedById, sortedBy } from '../../lib/listUtils';
import ChatMessages from '../../lib/models/ChatMessages';
import Documents from '../../lib/models/Documents';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import { indexedDisplayNames } from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import { ChatMessageType } from '../../lib/schemas/ChatMessage';
import { DocumentType } from '../../lib/schemas/Document';
import { GuessType } from '../../lib/schemas/Guess';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import { TagType } from '../../lib/schemas/Tag';
import addPuzzleAnswer from '../../methods/addPuzzleAnswer';
import addPuzzleTag from '../../methods/addPuzzleTag';
import createGuess from '../../methods/createGuess';
import ensurePuzzleDocument from '../../methods/ensurePuzzleDocument';
import removePuzzleAnswer from '../../methods/removePuzzleAnswer';
import removePuzzleTag from '../../methods/removePuzzleTag';
import sendChatMessage from '../../methods/sendChatMessage';
import undestroyPuzzle from '../../methods/undestroyPuzzle';
import updatePuzzle from '../../methods/updatePuzzle';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useCallState, { Action, CallState } from '../hooks/useCallState';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useSubscribeDisplayNames from '../hooks/useSubscribeDisplayNames';
import markdown from '../markdown';
import { trace } from '../tracing';
import ChatPeople from './ChatPeople';
import DocumentDisplay, { DocumentMessage } from './DocumentDisplay';
import ModalForm, { ModalFormHandle } from './ModalForm';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import SplitPanePlus from './SplitPanePlus';
import TagList from './TagList';
import FixedLayout from './styling/FixedLayout';
import { MonospaceFontFamily, SolvedPuzzleBackgroundColor } from './styling/constants';

// Shows a state dump as an in-page overlay when enabled.
const DEBUG_SHOW_CALL_STATE = false;

const tabId = Random.id();

const FilteredChatFields: ('_id' | 'puzzle' | 'text' | 'sender' | 'timestamp')[] = ['_id', 'puzzle', 'text', 'sender', 'timestamp'];
type FilteredChatMessageType = Pick<ChatMessageType, typeof FilteredChatFields[0]>

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
`;

const PUZZLE_PAGE_PADDING = 8;

const ChatMessageDiv = styled.div<{ isSystemMessage: boolean; }>`
  padding: 0 ${PUZZLE_PAGE_PADDING}px 2px;
  word-wrap: break-word;
  font-size: 14px;
  ${({ isSystemMessage }) => isSystemMessage && css`
    background-color: #e0e0e0;
  `}
`;

const ChatInputRow = styled.div`
  padding: ${PUZZLE_PAGE_PADDING}px;
  padding-bottom: max(env(safe-area-inset-bottom, 0px), ${PUZZLE_PAGE_PADDING}px);
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
`;

const PuzzleMetadataAnswer = styled.span`
  text-transform: uppercase;
  font-family: ${MonospaceFontFamily};
  font-weight: 300;
  background-color: ${SolvedPuzzleBackgroundColor};
  color: #000;

  // Tag-like
  display: inline-flex;
  align-items: center;
  line-height: 24px;
  margin: 2px 4px 2px 0;
  padding: 0 6px;
  border-radius: 4px;
`;

const AnswerRemoveButton = styled(Button)`
  // Specifier boost needed to override Bootstrap button style
  && {
    margin: 0 -6px 0 6px;
    padding: 0;
  }
`;

const PuzzleMetadataRow = styled.div`
  display: flex;
  width: 100%;
  font-size: 14px;
  align-items: flex-start;
  align-content: flex-start;
  justify-content: space-between;
`;

const PuzzleMetadataActionRow = styled(PuzzleMetadataRow)`
  align-items: center;
  flex-wrap: nowrap;

  a {
    margin-right: 8px;
  }

  button {
    margin: 2px 0 2px 8px;

    &:first-of-type {
      margin-left: auto;
    }
  }
`;

const PuzzleMetadataAnswers = styled.span`
  display: flex;
  flex-grow: 1;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  flex-wrap: wrap;
`;

const PuzzleMetadataExternalLink = styled.a`
  display: inline-block;
  font-weight: bold;
  white-space: nowrap;
`;

const StyledTagList = styled(TagList)`
  display: flex;
  flex-grow: 1;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  flex-wrap: wrap;
`;

const AnswerFormControl = styled(FormControl)`
  text-transform: uppercase;
  font-family: ${MonospaceFontFamily};
  font-weight: 300;
`;

const ChatMessage = React.memo(({
  message, senderDisplayName, isSystemMessage, suppressSender,
}: {
  message: FilteredChatMessageType;
  senderDisplayName: string;
  isSystemMessage: boolean;
  suppressSender: boolean;
}) => {
  const ts = shortCalendarTimeFormat(message.timestamp);

  return (
    <ChatMessageDiv isSystemMessage={isSystemMessage}>
      {!suppressSender && <ChatMessageTimestamp>{ts}</ChatMessageTimestamp>}
      {!suppressSender && <strong>{senderDisplayName}</strong>}
      <span
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: markdown(message.text) }}
      />
    </ChatMessageDiv>
  );
});

type ChatHistoryHandle = {
  saveScrollBottomTarget: () => void,
  snapToBottom: () => void,
  scrollToTarget: () => void;
}

const ChatHistory = React.forwardRef(({
  puzzleId, displayNames,
}: {
  puzzleId: string;
  displayNames: Record<string, string>;
}, forwardedRef: React.Ref<ChatHistoryHandle>) => {
  const chatMessages: FilteredChatMessageType[] = useTracker(() => (
    ChatMessages.find(
      { puzzle: puzzleId },
      { sort: { timestamp: 1 } },
    ).fetch()
  ), [puzzleId]);

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
      trace('ChatHistory saveScrollBottomTarget', {
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
    trace('ChatHistory onScrollObserved', { ignoring: shouldIgnoreNextScrollEvent.current });
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
      trace('ChatHistory scrollToTarget', {
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
      trace('ChatHistory scrollToTarget', { hasRef: false, target: scrollBottomTarget.current });
    }
  }, []);

  const snapToBottom = useCallback(() => {
    trace('ChatHistory snapToBottom');
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
    trace('ChatHistory snapToBottom on mount');
    snapToBottom();
  }, [snapToBottom]);

  useEffect(() => {
    // Add resize handler that scrolls to target
    window.addEventListener('resize', scrollToTarget);

    return () => {
      window.removeEventListener('resize', scrollToTarget);
    };
  }, [scrollToTarget]);

  useLayoutEffect(() => {
    // Whenever we rerender due to new messages arriving, make our
    // distance-from-bottom match the previous one, if it's larger than some
    // small fudge factor.  But if the user has actually scrolled into the backlog,
    // don't move the backlog while they're reading it -- instead, assume they want
    // to see the same messages in the same position, and adapt the target bottom
    // distance instead.
    trace('ChatHistory useLayoutEffect', {
      scrollBottomTarget: scrollBottomTarget.current,
      action: (scrollBottomTarget.current > 10 ? 'save' : 'snap'),
      messageCount: chatMessages.length,
    });
    if (scrollBottomTarget.current > 10) {
      saveScrollBottomTarget();
    } else {
      snapToBottom();
    }
  }, [chatMessages.length, saveScrollBottomTarget, snapToBottom]);

  trace('ChatHistory render', { messageCount: chatMessages.length });
  return (
    <ChatHistoryDiv ref={ref} onScroll={onScrollObserved}>
      {chatMessages.length === 0 ? (
        <ChatMessageDiv key="no-message" isSystemMessage={false}>
          <span>No chatter yet. Say something?</span>
        </ChatMessageDiv>
      ) : undefined}
      {chatMessages.map((msg, index, messages) => {
        const displayName = (msg.sender !== undefined) ? displayNames[msg.sender] : 'jolly-roger';
        // Only suppress sender and timestamp if:
        // * this is not the first message
        // * this message was sent by the same person as the previous message
        // * this message was sent within 60 seconds (60000 milliseconds) of the previous message
        const lastMessage = index > 0 ? messages[index - 1] : undefined;
        const suppressSender = !!lastMessage && lastMessage.sender === msg.sender && lastMessage.timestamp.getTime() + 60000 > msg.timestamp.getTime();
        return (
          <ChatMessage
            key={msg._id}
            message={msg}
            senderDisplayName={displayName ?? '???'}
            isSystemMessage={msg.sender === undefined}
            suppressSender={suppressSender}
          />
        );
      })}
    </ChatHistoryDiv>
  );
});

// The ESlint prop-types check seems to stumble over prop type checks somehow
// if we put the memo() and forwardRef() on the same line above.
const ChatHistoryMemo = React.memo(ChatHistory);

const chatInputStyles = {
  textarea: {
    // Chrome has a bug where if the line-height is a plain number (e.g. 1.42857143) rather than
    // an absolute size (e.g. 14px, 12pt) then when you zoom, scrollHeight is miscomputed.
    // scrollHeight is used for computing the effective size of a textarea, so we can grow the
    // input to accomodate its contents.
    // The default Chrome stylesheet has line-height set to a plain number.
    // We work around the Chrome bug by setting an explicit sized line-height for the textarea.
    lineHeight: '20px',
    padding: '9px 4px',
    resize: 'none' as const,
  },
};

const ChatInput = React.memo(({
  onHeightChange, onMessageSent, puzzleId, puzzleDeleted,
}: {
  onHeightChange: (newHeight: number) => void;
  onMessageSent: () => void;
  puzzleId: string;
  puzzleDeleted: boolean;
}) => {
  const [text, setText] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onInputChanged = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const sendMessageIfHasText = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
    if (text) {
      sendChatMessage.call({ puzzleId, message: text });
      setText('');
      if (onMessageSent) {
        onMessageSent();
      }
    }
  }, [text, puzzleId, onMessageSent]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageIfHasText();
    }
  }, [sendMessageIfHasText]);

  const onHeightChangeCb = useCallback((newHeight: number) => {
    if (onHeightChange) {
      trace('ChatInput onHeightChange', { newHeight });
      onHeightChange(newHeight);
    }
  }, [onHeightChange]);

  const preventDefaultCallback = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <ChatInputRow>
      <InputGroup>
        <TextareaAutosize
          ref={textAreaRef}
          className="form-control"
          style={chatInputStyles.textarea}
          maxLength={4000}
          minRows={1}
          maxRows={12}
          value={text}
          disabled={puzzleDeleted}
          onChange={onInputChanged}
          onKeyDown={onKeyDown}
          onHeightChange={onHeightChangeCb}
          placeholder="Chat"
        />
        <Button
          variant="secondary"
          onClick={sendMessageIfHasText}
          onMouseDown={preventDefaultCallback}
          disabled={puzzleDeleted || text.length === 0}
        >
          <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </InputGroup>
    </ChatInputRow>
  );
});

interface ChatSectionHandle {
  scrollHistoryToTarget: () => void;
}

const ChatSection = React.forwardRef(({
  chatDataLoading, puzzleDeleted, displayNames, puzzleId, huntId,
  callState, callDispatch,
}: {
  chatDataLoading: boolean;
  puzzleDeleted: boolean;
  displayNames: Record<string, string>;
  puzzleId: string;
  huntId: string;
  callState: CallState;
  callDispatch: React.Dispatch<Action>;
}, forwardedRef: React.Ref<ChatSectionHandle>) => {
  const historyRef = useRef<React.ElementRef<typeof ChatHistoryMemo>>(null);
  const scrollToTargetRequestRef = useRef<boolean>(false);

  const scrollHistoryToTarget = useCallback(() => {
    trace('ChatSection scrollHistoryToTarget', {
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
    trace('ChatSection onMessageSent', { hasRef: !!historyRef.current });
    if (historyRef.current) {
      historyRef.current.snapToBottom();
    }
  }, []);

  useImperativeHandle(forwardedRef, () => ({
    scrollHistoryToTarget,
  }));

  useLayoutEffect(() => {
    trace('ChatSection useLayoutEffect', {
      wantDeferredScroll: scrollToTargetRequestRef.current,
      hasRef: !!historyRef.current,
    });
    if (scrollToTargetRequestRef.current && historyRef.current) {
      scrollToTargetRequestRef.current = false;
      historyRef.current.scrollToTarget();
    }
  });

  trace('ChatSection render', { chatDataLoading });

  if (chatDataLoading) {
    return <ChatSectionDiv>loading...</ChatSectionDiv>;
  }

  return (
    <ChatSectionDiv>
      <ChatPeople
        huntId={huntId}
        puzzleId={puzzleId}
        puzzleDeleted={puzzleDeleted}
        onHeightChange={scrollHistoryToTarget}
        callState={callState}
        callDispatch={callDispatch}
      />
      <ChatHistoryMemo ref={historyRef} puzzleId={puzzleId} displayNames={displayNames} />
      <ChatInput
        puzzleId={puzzleId}
        puzzleDeleted={puzzleDeleted}
        onHeightChange={scrollHistoryToTarget}
        onMessageSent={onMessageSent}
      />
    </ChatSectionDiv>
  );
});
const ChatSectionMemo = React.memo(ChatSection);

const PuzzlePageMetadata = ({
  puzzle, displayNames, document, isDesktop,
}: {
  puzzle: PuzzleType;
  displayNames: Record<string, string>;
  document?: DocumentType;
  isDesktop: boolean;
}) => {
  const huntId = puzzle.hunt;
  const puzzleId = puzzle._id;

  const hasGuessQueue = useTracker(() => Hunts.findOne(huntId)?.hasGuessQueue ?? false, [huntId]);
  const canUpdate = useTracker(() => userMayWritePuzzlesForHunt(Meteor.userId(), huntId), [huntId]);

  const allPuzzles = useTracker(() => Puzzles.find({ hunt: huntId }).fetch(), [huntId]);
  const allTags = useTracker(() => Tags.find({ hunt: huntId }).fetch(), [huntId]);
  const guesses = useTracker(() => Guesses.find({ hunt: huntId, puzzle: puzzleId }).fetch(), [huntId, puzzleId]);

  const editModalRef = useRef<React.ElementRef<typeof PuzzleModalForm>>(null);
  const guessModalRef = useRef<React.ElementRef<typeof PuzzleGuessModal>>(null);
  const answerModalRef = useRef<React.ElementRef<typeof PuzzleAnswerModal>>(null);
  const onCreateTag = useCallback((tagName: string) => {
    addPuzzleTag.call({ puzzleId, tagName }, (error) => {
      // Not really much we can do in the case of a failure, but let's log it anyway
      if (error) {
        console.log('failed to create tag:');
        console.log(error);
      }
    });
  }, [puzzleId]);

  const onRemoveTag = useCallback((tagId: string) => {
    removePuzzleTag.call({ puzzleId, tagId }, (error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log('failed to remove tag:');
        console.log(error);
      }
    });
  }, [puzzleId]);

  const onRemoveAnswer = useCallback((guessId: string) => {
    removePuzzleAnswer.call({ puzzleId, guessId }, (error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log(`failed remove answer ${guessId}:`, error);
      }
    });
  }, [puzzleId]);

  const onEdit = useCallback((
    state: PuzzleModalFormSubmitPayload,
    callback: (err?: Error) => void
  ) => {
    Ansible.log('Updating puzzle properties', { puzzle: puzzleId, user: Meteor.userId(), state });
    const { huntId: _huntId, docType: _docType, ...rest } = state;
    updatePuzzle.call({ puzzleId, ...rest }, callback);
  }, [puzzleId]);

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
  const maybeTags: (TagType | undefined)[] = puzzle.tags.map((tagId) => { return tagsById.get(tagId); });
  const tags: TagType[] = maybeTags.filter<TagType>((t): t is TagType => t !== undefined);
  const correctGuesses = guesses.filter((guess) => guess.state === 'correct');
  const numGuesses = guesses.length;

  const answersElement = correctGuesses.length > 0 ? (
    <PuzzleMetadataAnswers>
      {
        correctGuesses.map((guess) => (
          <PuzzleMetadataAnswer key={`answer-${guess._id}`}>
            <span>{guess.guess}</span>
            {!hasGuessQueue && (
              <AnswerRemoveButton variant="success" onClick={() => onRemoveAnswer(guess._id)}>
                <FontAwesomeIcon fixedWidth icon={faTimes} />
              </AnswerRemoveButton>
            )}
          </PuzzleMetadataAnswer>
        ))
      }
    </PuzzleMetadataAnswers>
  ) : null;

  const puzzleLink = puzzle.url ? (
    <PuzzleMetadataExternalLink
      href={puzzle.url}
      target="_blank"
      rel="noreferrer noopener"
    >
      <FontAwesomeIcon fixedWidth icon={faPuzzlePiece} />
      {' '}
      <span>Puzzle</span>
    </PuzzleMetadataExternalLink>
  ) : null;

  const documentLink = (document && !isDesktop) ? (
    <DocumentDisplay document={document} displayMode="link" />
  ) : null;

  const editButton = canUpdate ? (
    <Button onClick={showEditModal} variant="secondary" size="sm" title="Edit puzzle...">
      <FontAwesomeIcon icon={faEdit} />
      {' '}
      Edit
    </Button>
  ) : null;

  let guessButton = null;
  if (puzzle.expectedAnswerCount > 0) {
    guessButton = hasGuessQueue ? (
      <>
        <Button variant="primary" size="sm" onClick={showGuessModal}>
          <FontAwesomeIcon icon={faKey} />
          {' Guess '}
          <Badge bg="light" text="dark">{numGuesses}</Badge>
        </Button>
        {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
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
          {' Answer'}
        </Button>
        {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
        <PuzzleAnswerModal
          ref={answerModalRef}
          puzzle={puzzle}
        />
      </>
    );
  }

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
        {puzzleLink}
        {documentLink}
        {editButton}
        {guessButton}
      </PuzzleMetadataActionRow>
      <PuzzleMetadataRow>
        {answersElement}
      </PuzzleMetadataRow>
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

const AnswerTableCell = styled.td`
  text-transform: uppercase;
  font-family: ${MonospaceFontFamily};
  font-weight: 300;
  word-break: break-all;
`;

enum PuzzleGuessSubmitState {
  IDLE = 'idle',
  FAILED = 'failed',
}

type PuzzleGuessModalHandle = {
  show: () => void;
};

const PuzzleGuessModal = React.forwardRef(({
  puzzle, guesses, displayNames,
}: {
  puzzle: PuzzleType;
  guesses: GuessType[];
  displayNames: Record<string, string>;
}, forwardedRef: React.Ref<PuzzleGuessModalHandle>) => {
  const [guessInput, setGuessInput] = useState<string>('');
  const [directionInput, setDirectionInput] = useState<number>(0);
  const [haveSetDirection, setHaveSetDirection] = useState<boolean>(false);
  const [confidenceInput, setConfidenceInput] = useState<number>(50);
  const [haveSetConfidence, setHaveSetConfidence] = useState<boolean>(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState<boolean>(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  const [submitState, setSubmitState] =
    useState<PuzzleGuessSubmitState>(PuzzleGuessSubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');
  const formRef = useRef<React.ElementRef<typeof ModalForm>>(null);

  useImperativeHandle(forwardedRef, () => ({
    show: () => {
      if (formRef.current) {
        formRef.current.show();
      }
    },
  }));

  const onGuessInputChange: NonNullable<FormControlProps['onChange']> = useCallback((event) => {
    setGuessInput(event.currentTarget.value.toUpperCase());
    setConfirmingSubmit(false);
  }, []);

  const onDirectionInputChange: NonNullable<FormControlProps['onChange']> = useCallback((event) => {
    setHaveSetDirection(true);
    setDirectionInput(parseInt(event.currentTarget.value, 10));
  }, []);

  const onConfidenceInputChange: NonNullable<FormControlProps['onChange']> = useCallback((event) => {
    setHaveSetConfidence(true);
    setConfidenceInput(parseInt(event.currentTarget.value, 10));
  }, []);

  const onSubmitGuess = useCallback(() => {
    const repeatGuess = guesses.find((g) => { return g.guess === guessInput; });
    const alreadySolved = puzzle.answers.length >= puzzle.expectedAnswerCount;
    if ((repeatGuess || alreadySolved) && !confirmingSubmit) {
      const repeatGuessStr = repeatGuess ? 'This answer has already been submitted. ' : '';
      const alreadySolvedStr = alreadySolved ? 'This puzzle has already been solved. ' : '';
      const msg = `${alreadySolvedStr} ${repeatGuessStr} Are you sure you want to submit this guess?`;
      setConfirmationMessage(msg);
      setConfirmingSubmit(true);
    } else if (!haveSetDirection || !haveSetConfidence) {
      setSubmitError('Please set a direction and confidence for your guess.');
      setSubmitState(PuzzleGuessSubmitState.FAILED);
    } else {
      createGuess.call({
        puzzleId: puzzle._id,
        guess: guessInput,
        direction: directionInput,
        confidence: confidenceInput,
      }, (error) => {
        if (error) {
          setSubmitError(error.message);
          setSubmitState(PuzzleGuessSubmitState.FAILED);
          console.log(error);
        } else {
          // Clear the input box.  Don't dismiss the dialog.
          setGuessInput('');
          setHaveSetConfidence(false);
          setConfidenceInput(50);
          setHaveSetDirection(false);
          setDirectionInput(0);
          setSubmitError('');
          setSubmitState(PuzzleGuessSubmitState.IDLE);
        }
        setConfirmingSubmit(false);
      });
    }
  }, [
    guesses, puzzle._id, puzzle.answers, puzzle.expectedAnswerCount,
    guessInput, directionInput, confidenceInput, confirmingSubmit,
    haveSetDirection, haveSetConfidence,
  ]);

  const clearError = useCallback(() => {
    setSubmitState(PuzzleGuessSubmitState.IDLE);
  }, []);

  const directionTooltip = (
    <Tooltip id="guess-direction-tooltip">
      Current value:
      {' '}
      {directionInput}
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id="guess-confidence-tooltip">
      Current value:
      {' '}
      {confidenceInput}
    </Tooltip>
  );

  return (
    <ModalForm
      ref={formRef}
      title={`${puzzle.answers.length >= puzzle.expectedAnswerCount ? 'Guess history for' : 'Submit answer to'} ${puzzle.title}`}
      onSubmit={onSubmitGuess}
      submitLabel={confirmingSubmit ? 'Confirm Submit' : 'Submit'}
    >
      <FormGroup as={Row} className="mb-3">
        <FormLabel column xs={3} htmlFor="jr-puzzle-guess">
          Guess
        </FormLabel>
        <Col xs={9}>
          <AnswerFormControl
            type="text"
            id="jr-puzzle-guess"
            autoFocus
            autoComplete="off"
            onChange={onGuessInputChange}
            value={guessInput}
            disabled={puzzle.deleted}
          />
        </Col>
      </FormGroup>

      <FormGroup as={Row} className="mb-3">
        <FormLabel column xs={3} htmlFor="jr-puzzle-guess-direction">
          Solve direction
        </FormLabel>
        <Col xs={9}>
          <OverlayTrigger placement="right" overlay={directionTooltip}>
            <FormControl
              type="range"
              id="jr-puzzle-guess-direction"
              min={-10}
              max={10}
              step={1}
              onChange={onDirectionInputChange}
              value={directionInput}
              disabled={puzzle.deleted}
              isValid={haveSetDirection}
            />
          </OverlayTrigger>
          <FormText>
            Pick a number between -10 (backsolved without opening
            the puzzle) to 10 (forward-solved without seeing the
            round) to indicate if you forward- or back-solved.
          </FormText>
        </Col>
      </FormGroup>

      <FormGroup as={Row} className="mb-3">
        <FormLabel column xs={3} htmlFor="jr-puzzle-guess-confidence">
          Confidence
        </FormLabel>
        <Col xs={9}>
          <OverlayTrigger placement="right" overlay={confidenceTooltip}>
            <FormControl
              type="range"
              id="jr-puzzle-guess-confidence"
              min={0}
              max={100}
              step={1}
              onChange={onConfidenceInputChange}
              value={confidenceInput}
              disabled={puzzle.deleted}
              isValid={haveSetConfidence}
            />
          </OverlayTrigger>
          <FormText>
            Pick a number between 0 and 100 for the probability that
            you think this answer is right.
          </FormText>
        </Col>
      </FormGroup>

      {guesses.length === 0 ? <div>No previous submissions.</div> : [
        <div key="label">Previous submissions:</div>,
        <Table key="table" bordered size="sm">
          <thead>
            <tr>
              <th>Guess</th>
              <th>Time</th>
              <th>Submitter</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedBy(guesses, (g) => g.createdAt).reverse().map((guess) => {
              return (
                <>
                  <tr key={guess._id}>
                    <AnswerTableCell>{guess.guess}</AnswerTableCell>
                    <td>{calendarTimeFormat(guess.createdAt)}</td>
                    <td>{displayNames[guess.createdBy]}</td>
                    <td style={{ textTransform: 'capitalize' }}>{guess.state}</td>
                  </tr>
                  {guess.additionalNotes && (
                    <tr key={`${guess._id}-notes`}>
                      <td
                        colSpan={4}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: markdown(guess.additionalNotes) }}
                      />
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </Table>,
      ]}
      {confirmingSubmit ? <Alert variant="warning">{confirmationMessage}</Alert> : null}
      {submitState === PuzzleGuessSubmitState.FAILED ? <Alert variant="danger" dismissible onClose={clearError}>{submitError}</Alert> : null}
    </ModalForm>
  );
});

enum PuzzleAnswerSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type PuzzleAnswerModalHandle = {
  show: () => void;
}

const PuzzleAnswerModal = React.forwardRef(({ puzzle }: {
  puzzle: PuzzleType;
}, forwardedRef: React.Ref<PuzzleAnswerModalHandle>) => {
  const [answer, setAnswer] = useState<string>('');
  const [submitState, setSubmitState] =
    useState<PuzzleAnswerSubmitState>(PuzzleAnswerSubmitState.IDLE);
  const [submitError, setSubmitError] = useState<string>('');

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

  const onAnswerChange: NonNullable<FormControlProps['onChange']> = useCallback((e) => {
    setAnswer(e.currentTarget.value);
  }, []);

  const onDismissError = useCallback(() => {
    setSubmitState(PuzzleAnswerSubmitState.IDLE);
    setSubmitError('');
  }, []);

  const onSubmit = useCallback(() => {
    setSubmitState(PuzzleAnswerSubmitState.SUBMITTING);
    setSubmitError('');
    addPuzzleAnswer.call({
      puzzleId: puzzle._id,
      answer,
    }, (error) => {
      if (error) {
        setSubmitError(error.message);
        setSubmitState(PuzzleAnswerSubmitState.FAILED);
      } else {
        setAnswer('');
        setSubmitState(PuzzleAnswerSubmitState.IDLE);
        hide();
      }
    });
  }, [puzzle._id, answer, hide]);

  return (
    <ModalForm
      ref={formRef}
      title={`Submit answer to ${puzzle.title}`}
      onSubmit={onSubmit}
      submitLabel={submitState === PuzzleAnswerSubmitState.SUBMITTING ? 'Confirm Submit' : 'Submit'}
    >
      <FormGroup as={Row} className="mb-3">
        <FormLabel column xs={3} htmlFor="jr-puzzle-answer">
          Answer
        </FormLabel>
        <Col xs={9}>
          <AnswerFormControl
            type="text"
            id="jr-puzzle-answer"
            autoFocus
            autoComplete="off"
            onChange={onAnswerChange}
            value={answer}
          />
        </Col>
      </FormGroup>

      {submitState === PuzzleAnswerSubmitState.FAILED ? (
        <Alert variant="danger" dismissible onClose={onDismissError}>
          { submitError || 'Something went wrong. Try again, or contact an admin?' }
        </Alert>
      ) : undefined}
    </ModalForm>
  );
});

const PuzzleDocumentDiv = styled.div`
  width: 100%;
  height: 100%;
  flex: auto;
  position: relative;
`;

const PuzzlePageMultiplayerDocument = React.memo(({ document }: {
  document?: DocumentType;
}) => {
  let inner = (
    <DocumentMessage>Attempting to load collaborative document...</DocumentMessage>
  );
  if (document) {
    inner = <DocumentDisplay document={document} displayMode="embed" />;
  }

  return (
    <PuzzleDocumentDiv>
      {inner}
    </PuzzleDocumentDiv>
  );
});

const PuzzleDeletedModal = ({
  puzzleId, huntId, replacedBy,
}: { puzzleId: string, huntId: string, replacedBy?: string }) => {
  const canUpdate = useTracker(() => userMayWritePuzzlesForHunt(Meteor.userId(), huntId), [huntId]);

  const replacementLoading = useSubscribe('mongo.puzzles.allowingDeleted', { _id: replacedBy });
  const loading = replacementLoading();

  const replacement = useTracker(() => Puzzles.findOneAllowingDeleted(replacedBy), [replacedBy]);

  const [show, setShow] = useState(true);
  const hide = useCallback(() => setShow(false), []);

  const undelete = useCallback(() => {
    undestroyPuzzle.call({ puzzleId });
    hide();
  }, [puzzleId, hide]);

  if (loading) {
    return null;
  }

  return (
    <Modal show={show} onHide={hide} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          This Jolly Roger entry has been removed
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          An operator has deleted this puzzle from Jolly Roger. You can still
          view it to extract information, but you won&apos;t be able to edit
          the shared document or send new chat messages going forward.
        </p>
        <p>
          We want to make sure this page doesn&apos;t distract folks on the
          team going forward, so there are no links back to this page. If you
          need to save any information, make sure to hold onto the URL until
          you&apos;re done.
        </p>
        {replacedBy && (
          <p>
            This puzzle has been replaced by
            {' '}
            <Link to={`/hunts/${huntId}/puzzles/${replacedBy}`}>{replacement?.title ?? 'Another puzzle'}</Link>
            .
          </p>
        )}
        {canUpdate && (
          <>
            <p>
              As an operator, you can un-delete this puzzle:
            </p>
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
};

const PuzzlePage = React.memo(() => {
  const puzzlePageDivRef = useRef<HTMLDivElement | null>(null);
  const chatSectionRef = useRef<ChatSectionHandle | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DefaultSidebarWidth);
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= MinimumDesktopWidth);

  const huntId = useParams<'huntId'>().huntId!;
  const puzzleId = useParams<'puzzleId'>().puzzleId!;

  // Add the current user to the collection of people viewing this puzzle.
  const subscribersTopic = `puzzle:${puzzleId}`;
  useSubscribe('subscribers.inc', subscribersTopic, {
    puzzle: puzzleId,
    hunt: huntId,
  });

  // Get the _list_ of subscribers to this puzzle and the _count_ of subscribers
  // for all puzzles (it's OK if the latter trickles in)
  const subscribersLoading = useSubscribe('subscribers.fetch', subscribersTopic);
  useSubscribe('subscribers.counts', { hunt: huntId });

  const displayNamesLoading = useSubscribeDisplayNames(huntId);

  const deletedPuzzleLoading = useSubscribe('mongo.puzzles.deleted', { _id: puzzleId });
  const puzzlesLoading = useSubscribe('mongo.puzzles', { hunt: huntId });
  const tagsLoading = useSubscribe('mongo.tags', { hunt: huntId });
  const guessesLoading = useSubscribe('mongo.guesses', { puzzle: puzzleId });
  const documentsLoading = useSubscribe('mongo.documents', { puzzle: puzzleId });

  const chatMessagesLoading = useSubscribe('mongo.chatmessages', {
    puzzle: puzzleId,
  }, {
    fields: Object.fromEntries(FilteredChatFields.map((f) => [f, 1])),
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
  // * Chat can be rendered with chat messages, display names, and the deleted
  //   puzzle
  // * Puzzle metadata needs puzzles, tags, documents, guesses, and display
  //   names
  const puzzleDataLoading =
    deletedPuzzleLoading() ||
    puzzlesLoading() ||
    tagsLoading() ||
    guessesLoading() ||
    documentsLoading() ||
    subscribersLoading() ||
    displayNamesLoading();
  const chatDataLoading =
    deletedPuzzleLoading() ||
    chatMessagesLoading() ||
    displayNamesLoading();

  const displayNames = useTracker(() => (
    puzzleDataLoading && chatDataLoading ?
      {} :
      indexedDisplayNames()
  ), [puzzleDataLoading, chatDataLoading]);
  // Sort by created at so that the "first" document always has consistent meaning
  const document = useTracker(() => (
    puzzleDataLoading ?
      undefined :
      Documents.findOne({ puzzle: puzzleId }, { sort: { createdAt: 1 } })
  ), [puzzleDataLoading, puzzleId]);

  const activePuzzle = useTracker(() => (
    puzzleDataLoading ?
      undefined :
      Puzzles.findOneAllowingDeleted(puzzleId)
  ), [puzzleDataLoading, puzzleId]);

  const puzzleTitle = activePuzzle ? `${activePuzzle.title}${activePuzzle.deleted ? ' (deleted)' : ''}` : '(no such puzzle)';
  const title = puzzleDataLoading ? 'loading...' : puzzleTitle;
  useBreadcrumb({
    title,
    path: `/hunts/${huntId}/puzzles/${puzzleId}`,
  });

  const documentTitle = `${title} :: Jolly Roger`;
  useDocumentTitle(documentTitle);

  const [callState, dispatch] = useCallState({ huntId, puzzleId, tabId });

  const onResize = useCallback(() => {
    setIsDesktop(window.innerWidth >= MinimumDesktopWidth);
    trace('PuzzlePage onResize', { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, []);

  const onCommitSideBarSize = useCallback((newSidebarWidth: number) => {
    setSidebarWidth(newSidebarWidth);
  }, []);

  const onChangeSideBarSize = useCallback(() => {
    trace('PuzzlePage onChangeSideBarSize', { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, []);

  useLayoutEffect(() => {
    // When sidebarWidth is updated, scroll history to the target
    trace('PuzzlePage useLayoutEffect', { hasRef: !!chatSectionRef.current });
    if (chatSectionRef.current) {
      chatSectionRef.current.scrollHistoryToTarget();
    }
  }, [sidebarWidth]);

  useEffect(() => {
    // Populate sidebar width on mount
    if (puzzlePageDivRef.current) {
      setSidebarWidth(Math.min(DefaultSidebarWidth, puzzlePageDivRef.current.clientWidth - MinimumDocumentWidth));
    }

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [onResize]);

  useEffect(() => {
    ensurePuzzleDocument.call({ puzzleId });
  }, [puzzleId]);

  trace('PuzzlePage render', { puzzleDataLoading, chatDataLoading });

  if (puzzleDataLoading) {
    return <FixedLayout className="puzzle-page" ref={puzzlePageDivRef}><span>loading...</span></FixedLayout>;
  }
  if (!activePuzzle) {
    return <FixedLayout className="puzzle-page" ref={puzzlePageDivRef}><span>No puzzle found :( Did you get that URL right?</span></FixedLayout>;
  }
  const metadata = (
    <PuzzlePageMetadata
      puzzle={activePuzzle}
      document={document}
      displayNames={displayNames}
      isDesktop={isDesktop}
    />
  );
  const chat = (
    <ChatSectionMemo
      ref={chatSectionRef}
      chatDataLoading={chatDataLoading}
      puzzleDeleted={activePuzzle.deleted ?? false}
      displayNames={displayNames}
      huntId={huntId}
      puzzleId={puzzleId}
      callState={callState}
      callDispatch={dispatch}
    />
  );
  const deletedModal = activePuzzle.deleted && (
    <PuzzleDeletedModal puzzleId={puzzleId} huntId={huntId} replacedBy={activePuzzle.replacedBy} />
  );

  let debugPane: React.ReactNode | undefined;
  if (DEBUG_SHOW_CALL_STATE) {
    (window as any).globalCallState = callState;
    const peerStreamsForRendering = new Map();
    callState.peerStreams.forEach((stream, peerId) => {
      peerStreamsForRendering.set(peerId, `active: ${stream.active}, tracks: ${stream.getTracks().length}`);
    });
    const callStateForRendering = {
      ...callState,
      peerStreams: peerStreamsForRendering,
      audioState: {
        mediaSource: callState.audioState?.mediaSource ? 'present' : 'absent',
        audioContext: callState.audioState?.audioContext ? 'present' : 'absent',
      },
      device: callState.device ? 'present' : 'absent',
      transports: {
        recv: callState.transports.recv ? 'present' : 'absent',
        send: callState.transports.send ? 'present' : 'absent',
      },
      router: callState.router ? 'present' : 'absent',
    };
    debugPane = (
      <pre
        style={{
          position: 'absolute',
          right: '0',
          bottom: '0',
          fontSize: '12px',
          backgroundColor: 'rgba(255,255,255,.7)',
        }}
      >
        {JSON.stringify(callStateForRendering, undefined, 2)}
      </pre>
    );
  }

  if (isDesktop) {
    return (
      <>
        {deletedModal}
        <FixedLayout className="puzzle-page" ref={puzzlePageDivRef}>
          <SplitPanePlus
            split="vertical"
            minSize={MinimumSidebarWidth}
            maxSize={-MinimumDocumentWidth}
            primary="first"
            autoCollapse1={-1}
            autoCollapse2={-1}
            size={sidebarWidth}
            onChanged={onChangeSideBarSize}
            onPaneChanged={onCommitSideBarSize}
          >
            {chat}
            <PuzzleContent>
              {metadata}
              <PuzzlePageMultiplayerDocument document={document} />
              {debugPane}
            </PuzzleContent>
          </SplitPanePlus>
        </FixedLayout>
      </>
    );
  }

  // Non-desktop (narrow layout)
  return (
    <>
      {deletedModal}
      <FixedLayout className="puzzle-page narrow">
        {metadata}
        {chat}
      </FixedLayout>
    </>
  );
});

export default PuzzlePage;
