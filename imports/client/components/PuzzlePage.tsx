/* eslint-disable max-len, no-console */
import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faKey } from '@fortawesome/free-solid-svg-icons/faKey';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons/faPaperPlane';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
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
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';
import { useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import Ansible from '../../ansible';
import { calendarTimeFormat, shortCalendarTimeFormat } from '../../lib/calendarTimeFormat';
import ChatMessages from '../../lib/models/chats';
import Documents from '../../lib/models/documents';
import Guesses from '../../lib/models/guesses';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import { ChatMessageType } from '../../lib/schemas/chat';
import { DocumentType } from '../../lib/schemas/document';
import { GuessType } from '../../lib/schemas/guess';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useDocumentTitle from '../hooks/use-document-title';
import useSubscribeDisplayNames from '../hooks/use-subscribe-display-names';
import markdown from '../markdown';
import { trace } from '../tracing';
import ChatPeople from './ChatPeople';
import DocumentDisplay from './Documents';
import ModalForm, { ModalFormHandle } from './ModalForm';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import SplitPanePlus from './SplitPanePlus';
import TagList from './TagList';
import FixedLayout from './styling/FixedLayout';

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

interface ChatMessageProps {
  message: FilteredChatMessageType;
  senderDisplayName: string;
  isSystemMessage: boolean;
  suppressSender: boolean;
}

const ChatMessage = React.memo((props: ChatMessageProps) => {
  const ts = shortCalendarTimeFormat(props.message.timestamp);
  const classes = classnames('chat-message', props.isSystemMessage && 'system-message');

  return (
    <div className={classes}>
      {!props.suppressSender && <span className="chat-timestamp">{ts}</span>}
      {!props.suppressSender && <strong>{props.senderDisplayName}</strong>}
      <span
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: markdown(props.message.text) }}
      />
    </div>
  );
});

interface ChatHistoryProps {
  puzzleId: string;
  displayNames: Record<string, string>;
}

type ChatHistoryHandle = {
  saveScrollBottomTarget: () => void,
  snapToBottom: () => void,
  scrollToTarget: () => void;
}

const ChatHistory = React.forwardRef((props: ChatHistoryProps, forwardedRef: React.Ref<ChatHistoryHandle>) => {
  const chatMessages: FilteredChatMessageType[] = useTracker(() => (
    ChatMessages.find(
      { puzzle: props.puzzleId },
      { sort: { timestamp: 1 } },
    ).fetch()
  ), [props.puzzleId]);

  const ref = useRef<HTMLDivElement>(null);
  const scrollBottomTarget = useRef<number>(0);
  const shouldIgnoreNextScrollEvent = useRef<boolean>(false);

  const saveScrollBottomTarget = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getClientRects()[0];
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
      const rect = ref.current.getClientRects()[0];
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
    <div ref={ref} className="chat-history" onScroll={onScrollObserved}>
      {chatMessages.length === 0 ? (
        <div className="chat-placeholder" key="no-message">
          <span>No chatter yet. Say something?</span>
        </div>
      ) : undefined}
      {chatMessages.map((msg, index, messages) => {
        const displayName = (msg.sender !== undefined) ? props.displayNames[msg.sender] : 'jolly-roger';
        // Only suppress sender and timestamp if:
        // * this is not the first message
        // * this message was sent by the same person as the previous message
        // * this message was sent within 60 seconds (60000 milliseconds) of the previous message
        const suppressSender = index > 0 && messages[index - 1].sender === msg.sender && messages[index - 1].timestamp.getTime() + 60000 > msg.timestamp.getTime();
        return (
          <ChatMessage
            key={msg._id}
            message={msg}
            senderDisplayName={displayName}
            isSystemMessage={msg.sender === undefined}
            suppressSender={suppressSender}
          />
        );
      })}
    </div>
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
    resize: 'none' as 'none',
  },
};

interface ChatInputProps {
  onHeightChange: (newHeight: number) => void;
  onMessageSent: () => void;
  puzzleId: string;
}

const ChatInput = React.memo((props: ChatInputProps) => {
  const [text, setText] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const { onHeightChange, onMessageSent, puzzleId } = props;

  const onInputChanged = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const sendMessageIfHasText = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
    if (text) {
      Meteor.call('sendChatMessage', puzzleId, text);
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
    <div className="chat-input-row">
      <div className="input-group">
        <TextareaAutosize
          ref={textAreaRef}
          className="form-control"
          style={chatInputStyles.textarea}
          maxLength={4000}
          minRows={1}
          maxRows={12}
          value={text}
          onChange={onInputChanged}
          onKeyDown={onKeyDown}
          onHeightChange={onHeightChangeCb}
          placeholder="Chat"
        />
        <span className="input-group-append">
          <Button
            variant="secondary"
            onClick={sendMessageIfHasText}
            onMouseDown={preventDefaultCallback}
            disabled={text.length === 0}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </Button>
        </span>
      </div>
    </div>
  );
});

interface ChatSectionProps {
  chatDataLoading: boolean;
  displayNames: Record<string, string>;
  puzzleId: string;
  huntId: string;
}

interface ChatSectionHandle {
  scrollHistoryToTarget: () => void;
}

const ChatSection = React.forwardRef((props: ChatSectionProps, forwardedRef: React.Ref<ChatSectionHandle>) => {
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

  trace('ChatSection render', { chatDataLoading: props.chatDataLoading });

  if (props.chatDataLoading) {
    return <div className="chat-section">loading...</div>;
  }

  return (
    <div className="chat-section">
      <ChatPeople huntId={props.huntId} puzzleId={props.puzzleId} onHeightChange={scrollHistoryToTarget} />
      <ChatHistoryMemo ref={historyRef} puzzleId={props.puzzleId} displayNames={props.displayNames} />
      <ChatInput
        puzzleId={props.puzzleId}
        onHeightChange={scrollHistoryToTarget}
        onMessageSent={onMessageSent}
      />
    </div>
  );
});
const ChatSectionMemo = React.memo(ChatSection);

interface PuzzlePageMetadataProps {
  puzzle: PuzzleType;
  displayNames: Record<string, string>;
  document?: DocumentType;
  isDesktop: boolean;
}

const PuzzlePageMetadata = (props: PuzzlePageMetadataProps) => {
  const huntId = props.puzzle.hunt;
  const puzzleId = props.puzzle._id;

  const hasGuessQueue = useTracker(() => Hunts.findOne(huntId)?.hasGuessQueue ?? false, [huntId]);
  const canUpdate = useTracker(() => userMayWritePuzzlesForHunt(Meteor.userId(), huntId), [huntId]);

  const allPuzzles = useTracker(() => Puzzles.find({ hunt: huntId }).fetch(), [huntId]);
  const allTags = useTracker(() => Tags.find({ hunt: huntId }).fetch(), [huntId]);
  const guesses = useTracker(() => Guesses.find({ hunt: huntId, puzzle: puzzleId }).fetch(), [huntId, puzzleId]);

  const editModalRef = useRef<React.ElementRef<typeof PuzzleModalForm>>(null);
  const guessModalRef = useRef<React.ElementRef<typeof PuzzleGuessModal>>(null);
  const answerModalRef = useRef<React.ElementRef<typeof PuzzleAnswerModal>>(null);
  const onCreateTag = useCallback((newTagName: string) => {
    Meteor.call('addTagToPuzzle', puzzleId, newTagName, (error?: Error) => {
      // Not really much we can do in the case of a failure, but let's log it anyway
      if (error) {
        console.log('failed to create tag:');
        console.log(error);
      }
    });
  }, [puzzleId]);

  const onRemoveTag = useCallback((tagIdToRemove: string) => {
    Meteor.call('removeTagFromPuzzle', puzzleId, tagIdToRemove, (error?: Error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log('failed to remove tag:');
        console.log(error);
      }
    });
  }, [puzzleId]);

  const onRemoveAnswer = useCallback((answer: string) => {
    Meteor.call('removeAnswerFromPuzzle', puzzleId, answer, (error?: Error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log(`failed remove answer ${answer}:`, error);
      }
    });
  }, [puzzleId]);

  const onEdit = useCallback((
    state: PuzzleModalFormSubmitPayload,
    callback: (err?: Error) => void
  ) => {
    Ansible.log('Updating puzzle properties', { puzzle: puzzleId, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', puzzleId, state, callback);
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

  const tagsById = _.indexBy(allTags, '_id');
  const tags = props.puzzle.tags.map((tagId) => { return tagsById[tagId]; }).filter(Boolean);
  const correctGuesses = guesses.filter((guess) => guess.state === 'correct');
  const numGuesses = guesses.length;

  const answersElement = correctGuesses.length > 0 ? (
    <span className="puzzle-metadata-answers">
      {
        correctGuesses.map((guess) => (
          <span key={`answer-${guess._id}`} className="answer tag-like">
            <span>{guess.guess}</span>
            {!hasGuessQueue && (
              <Button className="answer-remove-button" variant="success" onClick={() => onRemoveAnswer(guess._id)}>&#10006;</Button>
            )}
          </span>
        ))
      }
    </span>
  ) : null;

  const puzzleLink = props.puzzle.url ? (
    <a
      className="puzzle-metadata-external-link-button"
      href={props.puzzle.url}
      target="_blank"
      rel="noreferrer noopener"
    >
      <FontAwesomeIcon fixedWidth icon={faPuzzlePiece} />
      {' '}
      <span className="link-label">Puzzle</span>
    </a>
  ) : null;

  const documentLink = props.document ? (
    <span className={classnames(props.isDesktop && 'tablet-only')}>
      <DocumentDisplay document={props.document} displayMode="link" />
    </span>
  ) : null;

  const editButton = canUpdate ? (
    <Button onClick={showEditModal} variant="secondary" size="sm" title="Edit puzzle...">
      <FontAwesomeIcon icon={faEdit} />
      {' '}
      Edit
    </Button>
  ) : null;

  let guessButton = null;
  if (props.puzzle.expectedAnswerCount > 0) {
    guessButton = hasGuessQueue ? (
      <>
        <Button variant="primary" size="sm" className="puzzle-metadata-guess-button" onClick={showGuessModal}>
          <FontAwesomeIcon icon={faKey} />
          {' Guess '}
          <Badge variant="light">{numGuesses}</Badge>
        </Button>
        {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
        <PuzzleGuessModal
          ref={guessModalRef}
          puzzle={props.puzzle}
          guesses={guesses}
          displayNames={props.displayNames}
        />
      </>
    ) : (
      <>
        <Button variant="primary" size="sm" className="puzzle-metadata-answer-button" onClick={showAnswerModal}>
          <FontAwesomeIcon icon={faKey} />
          {' Answer'}
        </Button>
        {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
        <PuzzleAnswerModal
          ref={answerModalRef}
          puzzle={props.puzzle}
        />
      </>
    );
  }

  return (
    <div className="puzzle-metadata">
      <PuzzleModalForm
        key={puzzleId}
        ref={editModalRef}
        puzzle={props.puzzle}
        huntId={huntId}
        tags={allTags}
        onSubmit={onEdit}
      />
      <div className="puzzle-metadata-row puzzle-metadata-action-row">
        {puzzleLink}
        {documentLink}
        {editButton}
        {guessButton}
      </div>
      <div className="puzzle-metadata-row">
        {answersElement}
      </div>
      <div className="puzzle-metadata-row">
        <TagList
          puzzle={props.puzzle}
          tags={tags}
          onCreateTag={onCreateTag}
          onRemoveTag={onRemoveTag}
          linkToSearch={false}
          showControls={props.isDesktop}
          popoverRelated
          allPuzzles={allPuzzles}
          allTags={allTags}
          emptyMessage="No tags yet"
        />
      </div>
    </div>
  );
};

interface PuzzleGuessModalProps {
  puzzle: PuzzleType;
  guesses: GuessType[];
  displayNames: Record<string, string>;
}

enum PuzzleGuessSubmitState {
  IDLE = 'idle',
  FAILED = 'failed',
}

type PuzzleGuessModalHandle = {
  show: () => void;
};

const PuzzleGuessModal = React.forwardRef((
  props: PuzzleGuessModalProps,
  forwardedRef: React.Ref<PuzzleGuessModalHandle>
) => {
  const [guessInput, setGuessInput] = useState<string>('');
  const [directionInput, setDirectionInput] = useState<number>(0);
  const [confidenceInput, setConfidenceInput] = useState<number>(50);
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

  const onGuessInputChange: FormControlProps['onChange'] = useCallback((event) => {
    setGuessInput(event.currentTarget.value.toUpperCase());
    setConfirmingSubmit(false);
  }, []);

  const onDirectionInputChange: FormControlProps['onChange'] = useCallback((event) => {
    setDirectionInput(parseInt(event.currentTarget.value, 10));
  }, []);

  const onConfidenceInputChange: FormControlProps['onChange'] = useCallback((event) => {
    setConfidenceInput(parseInt(event.currentTarget.value, 10));
  }, []);

  const onSubmitGuess = useCallback(() => {
    const repeatGuess = props.guesses.find((g) => { return g.guess === guessInput; });
    const alreadySolved = props.puzzle.answers.length >= props.puzzle.expectedAnswerCount;
    if ((repeatGuess || alreadySolved) && !confirmingSubmit) {
      const repeatGuessStr = repeatGuess ? 'This answer has already been submitted. ' : '';
      const alreadySolvedStr = alreadySolved ? 'This puzzle has already been solved. ' : '';
      const msg = `${alreadySolvedStr} ${repeatGuessStr} Are you sure you want to submit this guess?`;
      setConfirmationMessage(msg);
      setConfirmingSubmit(true);
    } else {
      Meteor.call(
        'addGuessForPuzzle',
        props.puzzle._id,
        guessInput,
        directionInput,
        confidenceInput,
        (error?: Error) => {
          if (error) {
            setSubmitError(error.message);
            setSubmitState(PuzzleGuessSubmitState.FAILED);
            console.log(error);
          } else {
            // Clear the input box.  Don't dismiss the dialog.
            setGuessInput('');
          }
          setConfirmingSubmit(false);
        },
      );
    }
  }, [
    props.guesses, props.puzzle._id, props.puzzle.answers, props.puzzle.expectedAnswerCount,
    guessInput, directionInput, confidenceInput, confirmingSubmit,
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
      title={`${props.puzzle.answers.length >= props.puzzle.expectedAnswerCount ? 'Guess history for' : 'Submit answer to'} ${props.puzzle.title}`}
      onSubmit={onSubmitGuess}
      submitLabel={confirmingSubmit ? 'Confirm Submit' : 'Submit'}
    >
      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor="jr-puzzle-guess">
          Guess
        </FormLabel>
        <Col xs={9}>
          <FormControl
            type="text"
            id="jr-puzzle-guess"
            autoFocus
            autoComplete="off"
            onChange={onGuessInputChange}
            value={guessInput}
          />
        </Col>
      </FormGroup>

      <FormGroup as={Row}>
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
            />
          </OverlayTrigger>
          <FormText>
            Pick a number between -10 (backsolved without opening
            the puzzle) to 10 (forward-solved without seeing the
            round) to indicate if you forward- or back-solved.
          </FormText>
        </Col>
      </FormGroup>

      <FormGroup as={Row}>
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
            />
          </OverlayTrigger>
          <FormText>
            Pick a number between 0 and 100 for the probability that
            you think this answer is right.
          </FormText>
        </Col>
      </FormGroup>

      {props.guesses.length === 0 ? <div>No previous submissions.</div> : [
        <div key="label">Previous submissions:</div>,
        <Table className="guess-history-table" key="table" bordered size="sm">
          <thead>
            <tr>
              <th>Guess</th>
              <th>Time</th>
              <th>Submitter</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {_.sortBy(props.guesses, 'createdAt').reverse().map((guess) => {
              return (
                <tr key={guess._id} className={`guess-${guess.state}`}>
                  <td className="answer">{guess.guess}</td>
                  <td>{calendarTimeFormat(guess.createdAt)}</td>
                  <td>{props.displayNames[guess.createdBy]}</td>
                  <td style={{ textTransform: 'capitalize' }}>{guess.state}</td>
                </tr>
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

interface PuzzleAnswerModalProps {
  puzzle: PuzzleType;
}

enum PuzzleAnswerSubmitState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  FAILED = 'failed',
}

type PuzzleAnswerModalHandle = {
  show: () => void;
}

const PuzzleAnswerModal = React.forwardRef((props: PuzzleAnswerModalProps, forwardedRef: React.Ref<PuzzleAnswerModalHandle>) => {
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

  const onAnswerChange: FormControlProps['onChange'] = useCallback((e) => {
    setAnswer(e.currentTarget.value);
  }, []);

  const onDismissError = useCallback(() => {
    setSubmitState(PuzzleAnswerSubmitState.IDLE);
    setSubmitError('');
  }, []);

  const onSubmit = useCallback(() => {
    setSubmitState(PuzzleAnswerSubmitState.SUBMITTING);
    setSubmitError('');
    Meteor.call(
      'addCorrectGuessForPuzzle',
      props.puzzle._id,
      answer,
      (error?: Error) => {
        if (error) {
          setSubmitError(error.message);
          setSubmitState(PuzzleAnswerSubmitState.FAILED);
        } else {
          setAnswer('');
          setSubmitState(PuzzleAnswerSubmitState.IDLE);
          hide();
        }
      },
    );
  }, [props.puzzle._id, answer, hide]);

  return (
    <ModalForm
      ref={formRef}
      title={`Submit answer to ${props.puzzle.title}`}
      onSubmit={onSubmit}
      submitLabel={submitState === PuzzleAnswerSubmitState.SUBMITTING ? 'Confirm Submit' : 'Submit'}
    >
      <FormGroup as={Row}>
        <FormLabel column xs={3} htmlFor="jr-puzzle-answer">
          Answer
        </FormLabel>
        <Col xs={9}>
          <FormControl
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

interface PuzzlePageMultiplayerDocumentProps {
  document?: DocumentType;
}

const PuzzlePageMultiplayerDocument = React.memo((props: PuzzlePageMultiplayerDocumentProps) => {
  if (!props.document) {
    return (
      <div className="puzzle-document puzzle-document-message">
        Attempting to load collaborative document...
      </div>
    );
  }

  return (
    <div className="puzzle-document">
      <DocumentDisplay document={props.document} displayMode="embed" />
    </div>
  );
});

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

  const displayNamesLoading = useSubscribeDisplayNames();

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
  // * We show the displayname of the person who submitted a guess, so guesses depends on display names
  // * Chat messages show the displayname of the sender, so chatmessages depends on display names
  // * Puzzle metadata needs puzzles, tags, guesses, documents, and display names.
  //
  // We can render some things on incomplete data, but most of them really need full data:
  // * Chat can be rendered with just chat messages and display names
  // * Puzzle metadata needs puzzles, tags, documents, guesses, and display names
  const puzzleDataLoading =
    puzzlesLoading() ||
    tagsLoading() ||
    guessesLoading() ||
    documentsLoading() ||
    subscribersLoading() ||
    displayNamesLoading();
  const chatDataLoading =
    chatMessagesLoading() ||
    displayNamesLoading();

  const displayNames = useTracker(() => (
    puzzleDataLoading && chatDataLoading ?
      {} :
      Profiles.displayNames()
  ), [puzzleDataLoading, chatDataLoading]);
  // Sort by created at so that the "first" document always has consistent meaning
  const document = useTracker(() => (
    puzzleDataLoading ?
      undefined :
      Documents.findOne({ puzzle: puzzleId }, { sort: { createdAt: 1 } })
  ), [puzzleDataLoading, puzzleId]);

  const activePuzzle = useTracker(() => Puzzles.findOne(puzzleId), [puzzleId]);
  useBreadcrumb({
    title: puzzleDataLoading ? 'loading...' : activePuzzle!.title,
    path: `/hunts/${huntId}/puzzles/${puzzleId}`,
  });

  const title = `${activePuzzle ? activePuzzle.title : 'loading puzzle title...'} :: Jolly Roger`;
  useDocumentTitle(title);

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
    Meteor.call('ensureDocumentAndPermissions', puzzleId);
  }, [puzzleId]);

  trace('PuzzlePage render', { puzzleDataLoading, chatDataLoading });

  if (puzzleDataLoading) {
    return <FixedLayout className="puzzle-page" ref={puzzlePageDivRef}><span>loading...</span></FixedLayout>;
  }
  const metadata = (
    <PuzzlePageMetadata
      puzzle={activePuzzle!}
      document={document}
      displayNames={displayNames}
      isDesktop={isDesktop}
    />
  );
  const chat = (
    <ChatSectionMemo
      ref={chatSectionRef}
      chatDataLoading={chatDataLoading}
      displayNames={displayNames}
      huntId={huntId}
      puzzleId={puzzleId}
    />
  );

  if (isDesktop) {
    return (
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
          <div className="puzzle-content">
            {metadata}
            <PuzzlePageMultiplayerDocument document={document} />
          </div>
        </SplitPanePlus>
      </FixedLayout>
    );
  }

  // Non-desktop (narrow layout)
  return (
    <FixedLayout className="puzzle-page narrow">
      {metadata}
      {chat}
    </FixedLayout>
  );
});

export default PuzzlePage;
