import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faEdit } from '@fortawesome/free-solid-svg-icons/faEdit';
import { faKey } from '@fortawesome/free-solid-svg-icons/faKey';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons/faPaperPlane';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import React, {
  useCallback, useEffect, useImperativeHandle, useRef, useState,
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
import { RouteComponentProps } from 'react-router';
import TextareaAutosize from 'react-textarea-autosize';
import Ansible from '../../ansible';
import { calendarTimeFormat, shortCalendarTimeFormat } from '../../lib/calendarTimeFormat';
import ChatMessages from '../../lib/models/chats';
import Documents from '../../lib/models/documents';
import Guesses from '../../lib/models/guess';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import { ChatMessageType } from '../../lib/schemas/chat';
import { DocumentType } from '../../lib/schemas/document';
import { GuessType } from '../../lib/schemas/guess';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useDocumentTitle from '../hooks/use-document-title';
import markdown from '../markdown';
import ChatPeople from './ChatPeople';
import DocumentDisplay from './Documents';
import ModalForm, { ModalFormHandle } from './ModalForm';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import SplitPanePlus from './SplitPanePlus';
import TagList from './TagList';

/* eslint-disable max-len, no-console */

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
  chatMessages: FilteredChatMessageType[];
  displayNames: Record<string, string>;
}

type ChatHistoryHandle = {
  forceScrollBottom: () => void;
  maybeForceScrollBottom: () => void;
}

// TODO: chat scrolling is still kinda broken -- on initial pageload, it seems that we render, then only after the viewers data loads,
// we draw boxes for viewers, which results in ChatHistory getting placed in a smaller area, but it doesn't get any event/callback for this.
// The solution is probably to make sure that when ChatPeople rerenders, we find some way to trigger a maybeForceScrollBottom() here.
const ChatHistory = React.forwardRef((props: ChatHistoryProps, forwardedRef: React.Ref<ChatHistoryHandle>) => {
  const ref = useRef<HTMLDivElement>(null);
  const shouldScroll = useRef<boolean>(true);

  const saveShouldScroll = useCallback(() => {
    // Save whether the current scrollTop is equal to the ~maximum scrollTop.
    // If so, then we should make the log "stick" to the bottom, by manually scrolling to the bottom
    // when needed.
    const messagePane = ref.current;
    if (!messagePane) {
      return;
    }

    // Include a 5 px fudge factor to account for bad scrolling and
    // fractional pixels
    shouldScroll.current = (messagePane.clientHeight + messagePane.scrollTop + 5 >= messagePane.scrollHeight);
    console.log(`shouldScroll: ${shouldScroll.current}`);
  }, []);

  const forceScrollBottom = useCallback(() => {
    console.log('forceScrollBottom called');
    const messagePane = ref.current;
    if (messagePane) {
      messagePane.scrollTop = messagePane.scrollHeight;
      shouldScroll.current = true;
    }
  }, []);

  const maybeForceScrollBottom = useCallback(() => {
    console.log('maybeForceScrollBottom called');
    if (shouldScroll.current) {
      forceScrollBottom();
    }
  }, [forceScrollBottom]);

  useImperativeHandle(forwardedRef, () => ({
    forceScrollBottom,
    maybeForceScrollBottom,
  }));

  const resizeHandler = useCallback(() => {
    maybeForceScrollBottom();
  }, [maybeForceScrollBottom]);

  useEffect(() => {
    // Scroll to end of chat on initial mount.
    forceScrollBottom();
  }, [forceScrollBottom]);

  useEffect(() => {
    // Add resize handler
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, [resizeHandler]);

  useEffect(() => {
    // Whenever we rerender, check if we should be scrolling to the bottom.
    maybeForceScrollBottom();
  });

  return (
    <div ref={ref} className="chat-history" onScroll={saveShouldScroll}>
      {props.chatMessages.length === 0 ? (
        <div className="chat-placeholder" key="no-message">
          <span>No chatter yet. Say something?</span>
        </div>
      ) : undefined}
      {props.chatMessages.map((msg, index, messages) => {
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
      onHeightChange(newHeight);
    }
  }, [onHeightChange]);

  const preventDefaultCallback = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="chat-input-row">
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
      <Button
        variant="light"
        onClick={sendMessageIfHasText}
        onMouseDown={preventDefaultCallback}
        disabled={text.length === 0}
        tabIndex={-1}
      >
        <FontAwesomeIcon icon={faPaperPlane} />
      </Button>
    </div>
  );
});

interface ChatSectionProps {
  chatReady: boolean;
  chatMessages: FilteredChatMessageType[];
  displayNames: Record<string, string>;
  puzzleId: string;
  huntId: string;
}

const ChatSection = React.memo((props: ChatSectionProps) => {
  const historyRef = useRef<React.ElementRef<typeof ChatHistoryMemo>>(null);

  const onInputHeightChange = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.maybeForceScrollBottom();
    }
  }, []);

  const onMessageSent = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.forceScrollBottom();
    }
  }, []);

  return (
    <div className="chat-section">
      {props.chatReady ? null : <span>loading...</span>}
      <ChatPeople huntId={props.huntId} puzzleId={props.puzzleId} />
      <ChatHistoryMemo ref={historyRef} chatMessages={props.chatMessages} displayNames={props.displayNames} />
      <ChatInput
        puzzleId={props.puzzleId}
        onHeightChange={onInputHeightChange}
        onMessageSent={onMessageSent}
      />
    </div>
  );
});

interface PuzzlePageMetadataProps {
  puzzle: PuzzleType;
  allTags: TagType[];
  allPuzzles: PuzzleType[];
  guesses: GuessType[];
  displayNames: Record<string, string>;
  document?: DocumentType;
  isDesktop: boolean;
}

interface PuzzlePageMetadataTracker {
  canUpdate: boolean;
  hasGuessQueue: boolean;
}

const PuzzlePageMetadata = (props: PuzzlePageMetadataProps) => {
  const tracker = useTracker<PuzzlePageMetadataTracker>(() => {
    const hunt = Hunts.findOne(props.puzzle.hunt);
    const hasGuessQueue = !!(hunt && hunt.hasGuessQueue);
    return {
      canUpdate: userMayWritePuzzlesForHunt(Meteor.userId(), props.puzzle.hunt),
      hasGuessQueue,
    };
  }, [props.puzzle.hunt]);

  const editModalRef = useRef<React.ElementRef<typeof PuzzleModalForm>>(null);
  const guessModalRef = useRef<React.ElementRef<typeof PuzzleGuessModal>>(null);
  const answerModalRef = useRef<React.ElementRef<typeof PuzzleAnswerModal>>(null);
  const onCreateTag = useCallback((newTagName: string) => {
    Meteor.call('addTagToPuzzle', props.puzzle._id, newTagName, (error?: Error) => {
      // Not really much we can do in the case of a failure, but let's log it anyway
      if (error) {
        console.log('failed to create tag:');
        console.log(error);
      }
    });
  }, [props.puzzle._id]);

  const onRemoveTag = useCallback((tagIdToRemove: string) => {
    Meteor.call('removeTagFromPuzzle', props.puzzle._id, tagIdToRemove, (error?: Error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log('failed to remove tag:');
        console.log(error);
      }
    });
  }, [props.puzzle._id]);

  const onRemoveAnswer = useCallback((answer: string) => {
    Meteor.call('removeAnswerFromPuzzle', props.puzzle._id, answer, (error?: Error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log(`failed remove answer ${answer}:`, error);
      }
    });
  }, [props.puzzle._id]);

  const onEdit = useCallback((
    state: PuzzleModalFormSubmitPayload,
    callback: (err?: Error) => void
  ) => {
    Ansible.log('Updating puzzle properties', { puzzle: props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', props.puzzle._id, state, callback);
  }, [props.puzzle._id]);

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

  const tagsById = _.indexBy(props.allTags, '_id');
  const tags = props.puzzle.tags.map((tagId) => { return tagsById[tagId]; }).filter(Boolean);
  const isAdministrivia = tags.find((t) => t.name === 'administrivia');
  const correctGuesses = props.guesses.filter((guess) => guess.state === 'correct');
  const numGuesses = props.guesses.length;

  const answersElement = correctGuesses.length > 0 ? (
    <span className="puzzle-metadata-answers">
      {
        correctGuesses.map((guess) => (
          <span key={`answer-${guess._id}`} className="answer tag-like">
            <span>{guess.guess}</span>
            {!tracker.hasGuessQueue && (
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

  const editButton = tracker.canUpdate ? (
    <Button onClick={showEditModal} variant="secondary" size="sm" title="Edit puzzle...">
      <FontAwesomeIcon icon={faEdit} />
      {' '}
      Edit
    </Button>
  ) : null;

  let guessButton = null;
  if (!isAdministrivia) {
    guessButton = tracker.hasGuessQueue ? (
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
          guesses={props.guesses}
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
        key={props.puzzle._id}
        ref={editModalRef}
        puzzle={props.puzzle}
        huntId={props.puzzle.hunt}
        tags={props.allTags}
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
          allPuzzles={props.allPuzzles}
          allTags={props.allTags}
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

const findPuzzleById = function (puzzles: PuzzleType[], id: string) {
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    if (puzzle._id === id) {
      return puzzle;
    }
  }

  return undefined;
};

interface PuzzlePageParams {
  huntId: string;
  puzzleId: string;
}

interface PuzzlePageWithRouterParams extends RouteComponentProps<PuzzlePageParams> {
}

interface PuzzlePageTracker {
  puzzlesReady: boolean;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
  chatReady: boolean;
  chatMessages: FilteredChatMessageType[];
  displayNames: Record<string, string>;
  allGuesses: GuessType[];
  document?: DocumentType;
  canUpdate: boolean;
}

const PuzzlePage = React.memo((props: PuzzlePageWithRouterParams) => {
  const puzzlePageDivRef = useRef<HTMLDivElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DefaultSidebarWidth);
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= MinimumDesktopWidth);

  const tracker = useTracker<PuzzlePageTracker>(() => {
    const { params } = props.match;
    // There are some model dependencies that we have to be careful about:
    //
    // * We show the displayname of the person who submitted a guess, so guesses depends on display names
    // * Chat messages show the displayname of the sender, so chatmessages depends on display names
    // * Puzzle metadata needs puzzles, tags, guesses, documents, and display names.
    //
    // We can render some things on incomplete data, but most of them really need full data:
    // * Chat can be rendered with just chat messages and display names
    // * Puzzle metadata needs puzzles, tags, documents, guesses, and display names

    // Add the current user to the collection of people viewing this puzzle.
    // Don't use the subs manager - we don't want this cached.
    const subscribersTopic = `puzzle:${params.puzzleId}`;
    Meteor.subscribe('subscribers.inc', subscribersTopic, {
      puzzle: params.puzzleId,
      hunt: params.huntId,
    });
    const subscribersHandle = Meteor.subscribe('subscribers.fetch', subscribersTopic);

    const displayNamesHandle = Profiles.subscribeDisplayNames();
    let displayNames = {};
    if (displayNamesHandle.ready()) {
      displayNames = Profiles.displayNames();
    }

    const puzzlesHandle = Meteor.subscribe('mongo.puzzles', { hunt: params.huntId });
    const tagsHandle = Meteor.subscribe('mongo.tags', { hunt: params.huntId });
    const guessesHandle = Meteor.subscribe('mongo.guesses', { puzzle: params.puzzleId });
    const documentsHandle = Meteor.subscribe('mongo.documents', { puzzle: params.puzzleId });

    // Track the tally of people viewing this puzzle.
    Meteor.subscribe('subscribers.counts', { hunt: params.huntId });

    const puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready() && subscribersHandle.ready() && displayNamesHandle.ready();

    let allPuzzles: PuzzleType[];
    let allTags: TagType[];
    let allGuesses: GuessType[];
    let document: DocumentType | undefined;
    // There's no sense in doing this expensive computation here if we're still loading data,
    // since we're not going to render the children.
    if (puzzlesReady) {
      allPuzzles = Puzzles.find({ hunt: params.huntId }).fetch();
      allTags = Tags.find({ hunt: params.huntId }).fetch();
      allGuesses = Guesses.find({ hunt: params.huntId, puzzle: params.puzzleId }).fetch();

      // Sort by created at so that the "first" document always has consistent meaning
      document = Documents.findOne({ puzzle: params.puzzleId }, { sort: { createdAt: 1 } });
    } else {
      allPuzzles = [];
      allTags = [];
      allGuesses = [];
      document = undefined;
    }

    const chatFields: Record<string, number> = {};
    FilteredChatFields.forEach((f) => { chatFields[f] = 1; });
    const chatHandle = Meteor.subscribe(
      'mongo.chatmessages',
      { puzzle: params.puzzleId },
      { fields: chatFields }
    );

    // Chat is not ready until chat messages and display names have loaded, but doesn't care about any
    // other collections.
    const chatReady = chatHandle.ready() && displayNamesHandle.ready();
    const chatMessages = (chatReady && ChatMessages.find(
      { puzzle: params.puzzleId },
      { sort: { timestamp: 1 } },
    ).fetch()) || [];
    return {
      puzzlesReady,
      allPuzzles,
      allTags,
      chatReady,
      chatMessages,
      displayNames,
      allGuesses,
      document,
      canUpdate: userMayWritePuzzlesForHunt(Meteor.userId(), params.huntId),
    };
  }, [props.match.params.huntId, props.match.params.puzzleId]);

  const activePuzzle = findPuzzleById(tracker.allPuzzles, props.match.params.puzzleId);
  useBreadcrumb({
    title: tracker.puzzlesReady ? activePuzzle!.title : 'loading...',
    path: `/hunts/${props.match.params.huntId}/puzzles/${props.match.params.puzzleId}`,
  });

  const title = `${activePuzzle ? activePuzzle.title : 'loading puzzle title...'} :: Jolly Roger`;
  useDocumentTitle(title);

  const onResize = useCallback(() => {
    setIsDesktop(window.innerWidth >= MinimumDesktopWidth);
  }, []);

  const onChangeSideBarSize = useCallback((newSidebarWidth: number) => {
    setSidebarWidth(newSidebarWidth);
  }, []);

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
    Meteor.call('ensureDocumentAndPermissions', props.match.params.puzzleId);
  }, [props.match.params.puzzleId]);

  if (!tracker.puzzlesReady) {
    return <div className="puzzle-page jolly-roger-fixed" ref={puzzlePageDivRef}><span>loading...</span></div>;
  }
  const metadata = (
    <PuzzlePageMetadata
      puzzle={activePuzzle!}
      allTags={tracker.allTags}
      allPuzzles={tracker.allPuzzles}
      guesses={tracker.allGuesses}
      displayNames={tracker.displayNames}
      isDesktop={isDesktop}
      document={tracker.document}
    />
  );
  const chat = (
    <ChatSection
      chatReady={tracker.chatReady}
      chatMessages={tracker.chatMessages}
      displayNames={tracker.displayNames}
      huntId={props.match.params.huntId}
      puzzleId={props.match.params.puzzleId}
    />
  );

  if (isDesktop) {
    return (
      <div className="puzzle-page jolly-roger-fixed" ref={puzzlePageDivRef}>
        <SplitPanePlus
          split="vertical"
          minSize={MinimumSidebarWidth}
          maxSize={-MinimumDocumentWidth}
          primary="first"
          autoCollapse1={-1}
          autoCollapse2={-1}
          size={sidebarWidth}
          onPaneChanged={onChangeSideBarSize}
        >
          {chat}
          <div className="puzzle-content">
            {metadata}
            <PuzzlePageMultiplayerDocument document={tracker.document} />
          </div>
        </SplitPanePlus>
      </div>
    );
  }

  // Non-desktop (narrow layout)
  return (
    <div className="puzzle-page narrow jolly-roger-fixed">
      {metadata}
      {chat}
    </div>
  );
});

export default PuzzlePage;
