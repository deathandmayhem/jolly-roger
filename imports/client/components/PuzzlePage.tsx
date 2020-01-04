import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';
import PropTypes from 'prop-types';
import React from 'react';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import HelpBlock from 'react-bootstrap/lib/HelpBlock';
import Modal from 'react-bootstrap/lib/Modal';
import Nav from 'react-bootstrap/lib/Nav';
import NavItem from 'react-bootstrap/lib/NavItem';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Table from 'react-bootstrap/lib/Table';
import Tooltip from 'react-bootstrap/lib/Tooltip';
import DocumentTitle from 'react-document-title';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import classnames from 'classnames';
import DOMPurify from 'dompurify';
import marked from 'marked';
import moment from 'moment';
import TextareaAutosize from 'react-textarea-autosize';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import Ansible from '../../ansible';
import subsCache from '../subsCache';
import ModalForm from './ModalForm';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import RelatedPuzzleGroups from './RelatedPuzzleGroups';
import TagList from './TagList';
import { Subscribers, SubscriberCounters } from '../subscribers';
import Flags from '../../flags';
import SplitPanePlus from './SplitPanePlus';
import DocumentDisplay from './Documents';

import ChatMessagesSchema, { ChatMessageType } from '../../lib/schemas/chats';
import DocumentsSchema, { DocumentType } from '../../lib/schemas/documents';
import GuessesSchema, { GuessType } from '../../lib/schemas/guess';
import PuzzlesSchema, { PuzzleType } from '../../lib/schemas/puzzles';
import TagsSchema, { TagType } from '../../lib/schemas/tags';

import ChatMessages from '../../lib/models/chats';
import Documents from '../../lib/models/documents';
import Guesses from '../../lib/models/guess';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';

/* eslint-disable max-len, no-console */

const FilteredChatFields: ('_id' | 'puzzle' | 'text' | 'sender' | 'timestamp')[] = ['_id', 'puzzle', 'text', 'sender', 'timestamp'];
type FilteredChatMessageType = Pick<ChatMessageType, typeof FilteredChatFields[0]>
const FilteredChatMessagePropTypes = _.pick(ChatMessagesSchema.asReactPropTypes<ChatMessageType>(), ...FilteredChatFields);

const MinimumDesktopWidth = 600;
const MinimumDesktopStackingHeight = 400; // In two column mode, allow stacking at smaller heights
const MinimumMobileStackingHeight = 740; // Captures iPhone Plus but not iPad Mini
const MinimumSidebarWidth = 150;
const MaximumSidebarWidth = '75%';
const MinimumChatHeight = 96;

const DefaultSidebarWidth = 300;
const DefaultChatHeight = '60%';

// PuzzlePage has some pretty unique properties:
//
// * It's the only page which iframes other sites.  Doing so requires that we
//   specify the absolute size and position of the iframe, which makes us need
//   position: fixed.
// * There's up to four interesting pieces of content shown on this page:
//   * Related puzzles
//   * Chat
//   * Puzzle metadata (title, solved, puzzle link, guesses, tags)
//   * The collaborative document (usually a spreadsheet)
//   All four of them may have more content than fits reasonably on the screen,
//   so managing their sizes effectively is important.
// * At smaller screen sizes, we try to collapse content so the most useful
//   interactions are still possible.  On mobile, it often makes more sense to
//   delegate document interaction to the native Google apps.  Chat (and which
//   puzzle you're looking at) are the most important panes, since when people
//   are on runarounds the chat is the thing they want to see/write in most, and
//   that's the most common time you'd be using jolly-roger from a mobile device.
//   The least important view is usually related puzzles, since that's most useful
//   for metas or seeing if there's a theme in the answers for the round, which
//   people do less from mobile devices.
//
//   Given these priorities, we have several views:
//
//   a: related puzzles
//   b: chat
//   c: metadata
//   d: document
//
//   With abundant space ("desktop"):
//    _____________________________
//   |      |         c            |
//   |  a   |______________________|
//   |______|                      |
//   |      |                      |
//   |  b   |         d            |
//   |      |                      |
//   |______|______________________|
//
//   If height is small (<MinimumDesktopStackingHeight), but width remains
//   large (>=MinimumDesktopWidth), we collapse chat and related puzzles into a
//   tabbed view (initial tab is chat)
//    ____________________________
//   |__|__|         c            |
//   |     |______________________|
//   | b/a |                      |
//   |     |         d            |
//   |_____|______________________|
//
//   If width is small (<MinimumDesktopWidth), we have two possible layouts:
//     If height is large (>=MinimumMobileStackingHeight), we show three panes:
//    ____________
//   |     c     |
//   |___________|
//   |     a     |
//   |___________|
//   |           |
//   |     b     |
//   |           |
//   |___________|
//
//     If height is also small (<MinimumMobileStackingHeight), we collapse chat
//     and related puzzles into a tabset again:
//    ____________
//   |     c     |
//   |___________|
//   |_____|_____|
//   |    b/a    |
//   |           |
//   |___________|

interface ViewerSubscriber {
  user: string;
  name: string;
}

interface ViewersListProps {
  name: string;
  ready: boolean;
  subscribers: ViewerSubscriber[];
  unknown: number;
}

class ViewersList extends React.Component<ViewersListProps> {
  static propTypes = {
    name: PropTypes.string.isRequired,
    ready: PropTypes.bool.isRequired,
    subscribers: PropTypes.arrayOf(PropTypes.shape({
      user: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired).isRequired,
    unknown: PropTypes.number.isRequired,
  };

  render() {
    if (!this.props.ready) {
      return <span>loading...</span>;
    }

    return (
      <div>
        <ul>
          {this.props.subscribers.map(s => <li key={s.user}>{s.name}</li>)}
        </ul>
        {this.props.unknown !== 0 && `(Plus ${this.props.unknown} hunters with no name set)`}
      </div>
    );
  }
}

const ViewersListContainer = withTracker(({ name }: { name: string }) => {
  // Don't want this subscription persisting longer than necessary
  const subscribersHandle = Meteor.subscribe('subscribers.fetch', name);
  const profilesHandle = subsCache.subscribe('mongo.profiles');

  const ready = subscribersHandle.ready() && profilesHandle.ready();
  if (!ready) {
    return { ready: ready as boolean, unknown: 0, subscribers: [] };
  }

  let unknown = 0;
  const subscribers: ViewerSubscriber[] = [];

  // eslint-disable-next-line no-restricted-globals
  Subscribers.find({ name }).forEach((s) => {
    if (!s.user) {
      unknown += 1;
      return;
    }

    const profile = Profiles.findOne(s.user);
    if (!profile || !profile.displayName) {
      unknown += 1;
      return;
    }

    subscribers.push({ user: s.user, name: profile.displayName });
  });

  return { ready: ready as boolean, unknown, subscribers };
})(ViewersList);

ViewersListContainer.propTypes = {
  name: PropTypes.string.isRequired,
};

interface ViewersModalProps {
  name: string;
}

class ViewersModal extends React.Component<ViewersModalProps> {
  static propTypes = {
    name: PropTypes.string.isRequired,
  };

  state = { show: false };

  show = () => {
    this.setState({ show: true });
  };

  close = () => {
    this.setState({ show: false });
  };

  render() {
    return (
      <Modal show={this.state.show} onHide={this.close}>
        <Modal.Header closeButton>
          <Modal.Title>
            Currently viewing this puzzle
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.state.show && <ViewersListContainer name={this.props.name} />}
        </Modal.Body>
      </Modal>
    );
  }
}

interface ViewCountDisplayProps {
  count: number;
  name: string;
  subfetchesDisabled: boolean;
}

class ViewCountDisplay extends React.Component<ViewCountDisplayProps> {
  static propTypes = {
    count: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    subfetchesDisabled: PropTypes.bool.isRequired,
  };

  constructor(props: ViewCountDisplayProps) {
    super(props);
    this.modalRef = React.createRef();
  }

  showModal = () => {
    this.modalRef.current!.show();
  };

  modalRef: React.RefObject<ViewersModal>

  render() {
    const text = `(${this.props.count} viewing)`;
    if (this.props.subfetchesDisabled) {
      return <span>{text}</span>;
    }

    const tooltip = (
      <Tooltip id="view-count-tooltip">
        Click to see who is viewing this puzzle
      </Tooltip>
    );

    return (
      <span>
        <ViewersModal ref={this.modalRef} name={this.props.name} />
        <OverlayTrigger placement="top" overlay={tooltip}>
          <span className="view-count" onClick={this.showModal}>{text}</span>
        </OverlayTrigger>
      </span>
    );
  }
}

const ViewCountDisplayContainer = withTracker((_params: {count: number, name: string}) => {
  return { subfetchesDisabled: Flags.active('disable.subfetches') };
})(ViewCountDisplay);

interface RelatedPuzzleSectionProps {
  activePuzzle: PuzzleType;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
}

class RelatedPuzzleSection extends React.PureComponent<RelatedPuzzleSectionProps> {
  static propTypes = {
    activePuzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>,
    allPuzzles: PropTypes.arrayOf(
      PropTypes.shape(
        PuzzlesSchema.asReactPropTypes()
      ).isRequired as React.Validator<PuzzleType>
    ).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        TagsSchema.asReactPropTypes()
      ).isRequired as React.Validator<TagType>
    ).isRequired,
  };

  render() {
    return (
      <div className="related-puzzles-section">
        <div>Related puzzles:</div>
        <RelatedPuzzleGroups
          activePuzzle={this.props.activePuzzle}
          allPuzzles={this.props.allPuzzles}
          allTags={this.props.allTags}
          canUpdate={false}
          layout="table"
        />
      </div>
    );
  }
}

interface ChatMessageProps {
  message: FilteredChatMessageType;
  senderDisplayName: string;
  isSystemMessage: boolean;
  suppressSender: boolean;
}

class ChatMessage extends React.PureComponent<ChatMessageProps> {
  static propTypes = {
    message: PropTypes.shape(FilteredChatMessagePropTypes).isRequired,
    senderDisplayName: PropTypes.string.isRequired,
    isSystemMessage: PropTypes.bool.isRequired,
    suppressSender: PropTypes.bool.isRequired,
  };

  render() {
    const ts = moment(this.props.message.timestamp).calendar(undefined, {
      sameDay: 'LT',
    });
    const classes = classnames('chat-message', this.props.isSystemMessage && 'system-message');

    return (
      <div className={classes}>
        {!this.props.suppressSender && <span className="chat-timestamp">{ts}</span>}
        {!this.props.suppressSender && <strong>{this.props.senderDisplayName}</strong>}
        <span dangerouslySetInnerHTML={{ __html: marked(DOMPurify.sanitize(this.props.message.text)) }} />
      </div>
    );
  }
}

interface ChatHistoryProps {
  chatMessages: FilteredChatMessageType[];
  displayNames: Record<string, string>;
}

class ChatHistory extends React.PureComponent<ChatHistoryProps> {
  static propTypes = {
    chatMessages: PropTypes.arrayOf(
      PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  };

  constructor(props: ChatHistoryProps) {
    super(props);
    this.ref = React.createRef();
    this.shouldScroll = false;
  }

  componentDidMount() {
    // Scroll to end of chat.
    this.forceScrollBottom();

    // Make sure when the window is resized, we stick to the bottom if we were there
    this.resizeHandler = () => {
      this.maybeForceScrollBottom();
    };

    window.addEventListener('resize', this.resizeHandler);
  }

  componentDidUpdate() {
    this.maybeForceScrollBottom();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeHandler!);
  }

  onScroll = () => {
    this.saveShouldScroll();
  };

  saveShouldScroll = () => {
    // Save whether the current scrollTop is equal to the ~maximum scrollTop.
    // If so, then we should make the log "stick" to the bottom, by manually scrolling to the bottom
    // when needed.
    const messagePane = this.ref.current!;

    // Include a 5 px fudge factor to account for bad scrolling and
    // fractional pixels
    this.shouldScroll = (messagePane.clientHeight + messagePane.scrollTop + 5 >= messagePane.scrollHeight);
  };

  maybeForceScrollBottom = () => {
    if (this.shouldScroll) {
      this.forceScrollBottom();
    }
  };

  forceScrollBottom = () => {
    const messagePane = this.ref.current!;
    messagePane.scrollTop = messagePane.scrollHeight;
    this.shouldScroll = true;
  };

  ref: React.RefObject<HTMLDivElement>

  resizeHandler?: () => void;

  shouldScroll: boolean;

  render() {
    return (
      <div ref={this.ref} className="chat-history" onScroll={this.onScroll}>
        {this.props.chatMessages.length === 0 && <span key="no-message">No chatter yet. Say something?</span>}
        {this.props.chatMessages.map((msg, index, messages) => {
          const displayName = (msg.sender !== undefined) ? this.props.displayNames[msg.sender] : 'jolly-roger';
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
  }
}

const chatInputStyles = {
  textarea: {
    // Chrome has a bug where if the line-height is a plain number (e.g. 1.42857143) rather than
    // an absolute size (e.g. 14px, 12pt) then when you zoom, scrollHeight is miscomputed.
    // scrollHeight is used for computing the effective size of a textarea, so we can grow the
    // input to accomodate its contents.
    // The default Chrome stylesheet has line-height set to a plain number.
    // We work around the Chrome bug by setting an explicit sized line-height for the textarea.
    lineHeight: '16px',
    flex: 'none',
    padding: '9px 4px',
    borderWidth: '1px 0 0 0',
    resize: 'none' as 'none',
    maxHeight: '200px',
  },
};

interface ChatInputProps {
  onHeightChange: (newHeight: number) => void;
  onMessageSent: () => void;
  puzzleId: string;
}

interface ChatInputState {
  text: string;
}

class ChatInput extends React.PureComponent<ChatInputProps, ChatInputState> {
  static propTypes = {
    onHeightChange: PropTypes.func,
    onMessageSent: PropTypes.func,
    puzzleId: PropTypes.string,
  };

  state = {
    text: '',
  };

  onInputChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      text: e.target.value,
    });
  };

  onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (this.state.text) {
        Meteor.call('sendChatMessage', this.props.puzzleId, this.state.text);
        this.setState({
          text: '',
        });
        if (this.props.onMessageSent) {
          this.props.onMessageSent();
        }
      }
    }
  };

  onHeightChange = (newHeight: number) => {
    if (this.props.onHeightChange) {
      this.props.onHeightChange(newHeight);
    }
  };

  render() {
    return (
      <TextareaAutosize
        style={chatInputStyles.textarea}
        maxLength={4000}
        minRows={1}
        maxRows={12}
        value={this.state.text}
        onChange={this.onInputChanged}
        onKeyDown={this.onKeyDown}
        onHeightChange={this.onHeightChange}
        placeholder="Chat"
      />
    );
  }
}

interface ChatSectionProps {
  chatReady: boolean;
  chatMessages: FilteredChatMessageType[];
  displayNames: Record<string, string>;
  puzzleId: string;
}

class ChatSection extends React.PureComponent<ChatSectionProps> {
  static propTypes = {
    chatReady: PropTypes.bool.isRequired,
    chatMessages: PropTypes.arrayOf(
      PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    puzzleId: PropTypes.string.isRequired,
  };

  constructor(props: ChatSectionProps) {
    super(props);
    this.historyRef = React.createRef();
  }

  onInputHeightChange = () => {
    this.historyRef.current!.maybeForceScrollBottom();
  };

  onMessageSent = () => {
    this.historyRef.current!.forceScrollBottom();
  };

  historyRef: React.RefObject<ChatHistory>

  render() {
    return (
      <div className="chat-section">
        {this.props.chatReady ? null : <span>loading...</span>}
        <ChatHistory ref={this.historyRef} chatMessages={this.props.chatMessages} displayNames={this.props.displayNames} />
        <ChatInput
          puzzleId={this.props.puzzleId}
          onHeightChange={this.onInputHeightChange}
          onMessageSent={this.onMessageSent}
        />
      </div>
    );
  }
}

interface PuzzlePageSidebarProps {
  activePuzzle: PuzzleType;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
  chatReady: boolean;
  chatMessages: FilteredChatMessageType[];
  displayNames: Record<string, string>;
  canUpdate: boolean;
  isDesktop: boolean;
  isStackable: boolean;
  showRelated: boolean;
  onChangeShowRelated: (showRelated: boolean) => void;
}

class PuzzlePageSidebar extends React.PureComponent<PuzzlePageSidebarProps> {
  static propTypes = {
    activePuzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>,
    allPuzzles: PropTypes.arrayOf(
      PropTypes.shape(
        PuzzlesSchema.asReactPropTypes()
      ).isRequired as React.Validator<PuzzleType>
    ).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        TagsSchema.asReactPropTypes()
      ).isRequired as React.Validator<TagType>
    ).isRequired,
    chatReady: PropTypes.bool.isRequired,
    chatMessages: PropTypes.arrayOf(
      PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    canUpdate: PropTypes.bool.isRequired,
    isDesktop: PropTypes.bool.isRequired,
    isStackable: PropTypes.bool.isRequired,
    showRelated: PropTypes.bool.isRequired,
    onChangeShowRelated: PropTypes.func.isRequired,
  };

  onCollapseChanged = (collapsed: 0 | 1 | 2) => {
    this.props.onChangeShowRelated(collapsed !== 1);
  };

  render() {
    let collapse: 0 | 1 | 2 = 0;
    if (this.props.isStackable) {
      collapse = this.props.showRelated ? 0 : 1;
    } else {
      collapse = this.props.showRelated ? 2 : 1;
    }
    const classes = classnames('sidebar', { stackable: this.props.isStackable });
    return (
      <div className={classes}>
        {!this.props.isStackable && (
          <Nav bsStyle="tabs" justified>
            <NavItem
              active={!this.props.showRelated}
              onClick={() => { this.props.onChangeShowRelated(false); }}
            >
              Chat
            </NavItem>
            <NavItem
              active={this.props.showRelated}
              onClick={() => { this.props.onChangeShowRelated(true); }}
            >
              Related
            </NavItem>
          </Nav>
        )}
        <div className="split-pane-wrapper">
          <SplitPanePlus
            split="horizontal"
            primary="second"
            defaultSize={DefaultChatHeight}
            minSize={MinimumChatHeight}
            autoCollapse1={50}
            autoCollapse2={-1}
            allowResize={this.props.isStackable}
            scaling="relative"
            onCollapseChanged={this.onCollapseChanged}
            collapsed={collapse}
          >
            <RelatedPuzzleSection
              activePuzzle={this.props.activePuzzle}
              allPuzzles={this.props.allPuzzles}
              allTags={this.props.allTags}
            />
            <ChatSection
              chatReady={this.props.chatReady}
              chatMessages={this.props.chatMessages}
              displayNames={this.props.displayNames}
              puzzleId={this.props.activePuzzle._id}
            />
          </SplitPanePlus>
        </div>
      </div>
    );
  }
}

interface PuzzlePageMetadataParams {
  puzzle: PuzzleType;
  allTags: TagType[];
  guesses: GuessType[];
  displayNames: Record<string, string>;
  document?: DocumentType;
  isDesktop: boolean;
}

interface PuzzlePageMetadataProps extends PuzzlePageMetadataParams {
  subcountersDisabled: boolean;
  viewCount: number;
  canUpdate: boolean;
}

class PuzzlePageMetadata extends React.Component<PuzzlePageMetadataProps> {
  static propTypes = {
    puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        TagsSchema.asReactPropTypes()
      ).isRequired as React.Validator<TagType>
    ).isRequired,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(
        GuessesSchema.asReactPropTypes()
      ).isRequired as React.Validator<GuessType>
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    document: PropTypes.shape(DocumentsSchema.asReactPropTypes()) as React.Requireable<DocumentType>,
    isDesktop: PropTypes.bool.isRequired,
    subcountersDisabled: PropTypes.bool.isRequired,
    viewCount: PropTypes.number.isRequired,
    canUpdate: PropTypes.bool.isRequired,
  };

  constructor(props: PuzzlePageMetadataProps) {
    super(props);
    this.editModalRef = React.createRef();
    this.guessModalRef = React.createRef();
  }

  onCreateTag = (newTagName: string) => {
    Meteor.call('addTagToPuzzle', this.props.puzzle._id, newTagName, (error?: Error) => {
      // Not really much we can do in the case of a failure, but let's log it anyway
      if (error) {
        console.log('failed to create tag:');
        console.log(error);
      }
    });
  };

  onRemoveTag = (tagIdToRemove: string) => {
    Meteor.call('removeTagFromPuzzle', this.props.puzzle._id, tagIdToRemove, (error?: Error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log('failed to remove tag:');
        console.log(error);
      }
    });
  };

  onEdit = (state: PuzzleModalFormSubmitPayload, callback: (err?: Error) => void) => {
    Ansible.log('Updating puzzle properties', { puzzle: this.props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', this.props.puzzle._id, state, callback);
  };

  showGuessModal = () => {
    this.guessModalRef.current!.show();
  };

  showEditModal = () => {
    this.editModalRef.current!.show();
  };

  editButton = () => {
    if (this.props.canUpdate) {
      return (
        <Button onClick={this.showEditModal} bsStyle="default" bsSize="xs" title="Edit puzzle...">
          <FontAwesomeIcon icon={faEdit} />
        </Button>
      );
    }
    return null;
  };

  editModalRef: React.RefObject<PuzzleModalForm>

  guessModalRef: React.RefObject<PuzzleGuessModal>

  render() {
    const tagsById = _.indexBy(this.props.allTags, '_id');
    const tags = _.compact(this.props.puzzle.tags.map((tagId) => { return tagsById[tagId]; }));
    const isAdministrivia = _.findWhere(tags, { name: 'administrivia' });
    const answerComponent = this.props.puzzle.answer ? (
      <span className="puzzle-metadata-answer">
        <span className="answer">{this.props.puzzle.answer}</span>
      </span>
    ) : null;
    const hideViewCount = this.props.subcountersDisabled;
    const numGuesses = this.props.guesses.length;
    const guessesString = `${numGuesses || 'no'} ${numGuesses === 1 ? 'guess' : 'guesses'}`;
    return (
      <div className="puzzle-metadata">
        <PuzzleModalForm
          key={this.props.puzzle._id}
          ref={this.editModalRef}
          puzzle={this.props.puzzle}
          huntId={this.props.puzzle.hunt}
          tags={this.props.allTags}
          onSubmit={this.onEdit}
        />
        <div className="puzzle-metadata-row">
          <div className="puzzle-metadata-title-set">
            {this.editButton()}
            {' '}
            <span className="puzzle-metadata-title">{this.props.puzzle.title}</span>
            {' '}
            {!hideViewCount && (
              <ViewCountDisplayContainer
                count={this.props.viewCount}
                name={`puzzle:${this.props.puzzle._id}`}
              />
            )}
          </div>
          {this.props.puzzle.answer && answerComponent}
        </div>
        <div className={classnames('puzzle-metadata-row', this.props.isDesktop && 'puzzle-metadata-tag-editor-row')}>
          <div className="puzzle-metadata-tags-label">Tags: </div>
          <TagList
            puzzle={this.props.puzzle}
            tags={tags}
            onCreateTag={this.onCreateTag}
            onRemoveTag={this.onRemoveTag}
            linkToSearch={false}
            showControls={this.props.isDesktop}
          />
        </div>
        <div className="puzzle-metadata-row puzzle-metadata-action-row">
          {this.props.puzzle.url && (
            <a
              className="puzzle-metadata-external-link-button"
              href={this.props.puzzle.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Puzzle
              {' '}
              <FontAwesomeIcon fixedWidth icon={faExternalLinkAlt} />
            </a>
          )}
          {this.props.document && (
            <span className={classnames(this.props.isDesktop && 'tablet-only')}>
              <DocumentDisplay document={this.props.document} displayMode="link" />
            </span>
          )}
          {!isAdministrivia && (
            <Button className="puzzle-metadata-guess-button" onClick={this.showGuessModal}>
              {this.props.puzzle.answer ? `View ${guessesString}` : `Submit answer (${guessesString})`}
            </Button>
          )}
        </div>
        <PuzzleGuessModal
          ref={this.guessModalRef}
          puzzle={this.props.puzzle}
          guesses={this.props.guesses}
          displayNames={this.props.displayNames}
        />
      </div>
    );
  }
}

const PuzzlePageMetadataContainer = withTracker(({ puzzle }: PuzzlePageMetadataParams) => {
  const count = SubscriberCounters.findOne(`puzzle:${puzzle._id}`);
  return {
    subcountersDisabled: Flags.active('disable.subcounters'),
    viewCount: count ? count.value : 0,
    canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.update'),
  };
})(PuzzlePageMetadata);

PuzzlePageMetadataContainer.propTypes = {
  puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>,
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

type PuzzleGuessModalState = {
  guessInput: string;
  directionInput: number;
  confidenceInput: number;
} & ({
  confirmingSubmit: false;
} | {
  confirmingSubmit: true;
  confirmationMessage: string;
}) & ({
  submitState: PuzzleGuessSubmitState.IDLE;
} | {
  submitState: PuzzleGuessSubmitState.FAILED;
  errorMessage: string;
})

class PuzzleGuessModal extends React.Component<PuzzleGuessModalProps, PuzzleGuessModalState> {
  static propTypes = {
    puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(
        GuessesSchema.asReactPropTypes()
      ).isRequired as React.Validator<GuessType>
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  };

  state = {
    guessInput: '',
    directionInput: 0,
    confidenceInput: 50,
    submitState: PuzzleGuessSubmitState.IDLE,
    confirmingSubmit: false,
  } as PuzzleGuessModalState;

  constructor(props: PuzzleGuessModalProps) {
    super(props);
    this.formRef = React.createRef();
  }

  onGuessInputChange = (event: React.FormEvent<FormControl>) => {
    this.setState({
      guessInput: (event as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value.toUpperCase(),
      confirmingSubmit: false,
    });
  };

  onDirectionInputChange = (event: React.FormEvent<FormControl>) => {
    this.setState({ directionInput: parseInt((event as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value, 10) });
  };

  onConfidenceInputChange = (event: React.FormEvent<FormControl>) => {
    this.setState({ confidenceInput: parseInt((event as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value, 10) });
  };

  onSubmitGuess = () => {
    const repeatGuess = _.find(this.props.guesses, (g) => { return g.guess === this.state.guessInput; });
    const alreadySolved = this.props.puzzle.answer;
    if ((repeatGuess || alreadySolved) && !this.state.confirmingSubmit) {
      const repeatGuessStr = repeatGuess ? 'This answer has already been submitted. ' : '';
      const alreadySolvedStr = alreadySolved ? 'This puzzle has already been solved. ' : '';
      const msg = `${alreadySolvedStr} ${repeatGuessStr} Are you sure you want to submit this guess?`;
      this.setState({
        confirmingSubmit: true,
        confirmationMessage: msg,
      } as PuzzleGuessModalState);
    } else {
      Meteor.call(
        'addGuessForPuzzle',
        this.props.puzzle._id,
        this.state.guessInput,
        this.state.directionInput,
        this.state.confidenceInput,
        (error?: Error) => {
          if (error) {
            this.setState({
              submitState: PuzzleGuessSubmitState.FAILED,
              errorMessage: error.message,
            } as PuzzleGuessModalState);
            console.log(error);
          }

          // Clear the input box.  Don't dismiss the dialog.
          this.setState({
            confirmingSubmit: false,
          });
        },
      );
    }
  };

  clearError = () => {
    this.setState({
      submitState: PuzzleGuessSubmitState.IDLE,
    });
  };

  show = () => {
    this.formRef.current!.show();
  };

  formRef: React.RefObject<ModalForm>

  render() {
    const directionTooltip = (
      <Tooltip id="guess-direction-tooltip">
        Current value:
        {' '}
        {this.state.directionInput}
      </Tooltip>
    );
    const confidenceTooltip = (
      <Tooltip id="guess-confidence-tooltip">
        Current value:
        {' '}
        {this.state.confidenceInput}
      </Tooltip>
    );

    return (
      <ModalForm
        ref={this.formRef}
        title={`${this.props.puzzle.answer ? 'Guess history for' : 'Submit answer to'} ${this.props.puzzle.title}`}
        onSubmit={this.onSubmitGuess}
        submitLabel={this.state.confirmingSubmit ? 'Confirm Submit' : 'Submit'}
      >
        <FormGroup>
          <ControlLabel htmlFor="jr-puzzle-guess" className="col-xs-3">
            Guess
          </ControlLabel>
          <div className="col-xs-9">
            <FormControl
              type="text"
              id="jr-puzzle-guess"
              autoFocus
              autoComplete="off"
              onChange={this.onGuessInputChange}
              value={this.state.guessInput}
            />
          </div>

          <ControlLabel htmlFor="jr-puzzle-guess-direction" className="col-xs-3">
            Solve direction
          </ControlLabel>
          <div className="col-xs-9">
            <OverlayTrigger placement="right" overlay={directionTooltip}>
              <FormControl
                type="range"
                id="jr-puzzle-guess-direction"
                min={-10}
                max={10}
                step={1}
                onChange={this.onDirectionInputChange}
                value={this.state.directionInput}
              />
            </OverlayTrigger>
            <HelpBlock>
              Pick a number between -10 (backsolved without opening
              the puzzle) to 10 (forward-solved without seeing the
              round) to indicate if you forward- or back-solved.
            </HelpBlock>
          </div>

          <ControlLabel htmlFor="jr-puzzle-guess-confidence" className="col-xs-3">
            Confidence
          </ControlLabel>
          <div className="col-xs-9">
            <OverlayTrigger placement="right" overlay={confidenceTooltip}>
              <FormControl
                type="range"
                id="jr-puzzle-guess-confidence"
                min={0}
                max={100}
                step={1}
                onChange={this.onConfidenceInputChange}
                value={this.state.confidenceInput}
              />
            </OverlayTrigger>
            <HelpBlock>
              Pick a number between 0 and 100 for the probability that
              you think this answer is right.
            </HelpBlock>
          </div>
        </FormGroup>

        {this.props.guesses.length === 0 ? <div>No previous submissions.</div> : [
          <div key="label">Previous submissions:</div>,
          <Table className="guess-history-table" key="table" bordered condensed>
            <thead>
              <tr>
                <th>Guess</th>
                <th>Time</th>
                <th>Submitter</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {_.sortBy(this.props.guesses, 'createdAt').reverse().map((guess) => {
                return (
                  <tr key={guess._id} className={`guess-${guess.state}`}>
                    <td className="answer">{guess.guess}</td>
                    <td>{moment(guess.createdAt).calendar()}</td>
                    <td>{this.props.displayNames[guess.createdBy]}</td>
                    <td style={{ textTransform: 'capitalize' }}>{guess.state}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>,
        ]}
        {this.state.confirmingSubmit ? <Alert bsStyle="warning">{this.state.confirmationMessage}</Alert> : null}
        {this.state.submitState === PuzzleGuessSubmitState.FAILED ? <Alert bsStyle="danger" onDismiss={this.clearError}>{this.state.errorMessage}</Alert> : null}
      </ModalForm>
    );
  }
}

interface PuzzlePageMultiplayerDocumentProps {
  document?: DocumentType;
}

class PuzzlePageMultiplayerDocument extends React.PureComponent<PuzzlePageMultiplayerDocumentProps> {
  static propTypes = {
    document: PropTypes.shape(DocumentsSchema.asReactPropTypes()) as React.Requireable<DocumentType>,
  };

  render() {
    if (!this.props.document) {
      return (
        <div className="puzzle-document puzzle-document-message">
          Attempting to load collaborative document...
        </div>
      );
    }

    return (
      <div className="puzzle-document">
        <DocumentDisplay document={this.props.document} displayMode="embed" />
      </div>
    );
  }
}

interface PuzzlePageContentProps {
  puzzle: PuzzleType;
  allTags: TagType[];
  guesses: GuessType[];
  displayNames: Record<string, string>;
  document?: DocumentType;
  isDesktop: boolean;
}

class PuzzlePageContent extends React.PureComponent<PuzzlePageContentProps> {
  static propTypes = {
    puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        TagsSchema.asReactPropTypes()
      ).isRequired as React.Validator<TagType>
    ).isRequired,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(
        GuessesSchema.asReactPropTypes()
      ).isRequired as React.Validator<GuessType>
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    document: PropTypes.shape(DocumentsSchema.asReactPropTypes()) as React.Requireable<DocumentType>,
    isDesktop: PropTypes.bool.isRequired,
  };

  render() {
    return (
      <div className="puzzle-content">
        <PuzzlePageMetadataContainer
          puzzle={this.props.puzzle}
          allTags={this.props.allTags}
          guesses={this.props.guesses}
          displayNames={this.props.displayNames}
          isDesktop={this.props.isDesktop}
          document={this.props.document}
        />
        {this.props.isDesktop &&
          <PuzzlePageMultiplayerDocument document={this.props.document} />
        }
      </div>
    );
  }
}

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
  params: {huntId: string; puzzleId: string};
}

interface PuzzlePageProps extends PuzzlePageParams {
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

interface PuzzlePageState {
  showRelated: boolean;
  isDesktop: boolean;
  isStackable: boolean;
}

class PuzzlePage extends React.Component<PuzzlePageProps, PuzzlePageState> {
  static propTypes = {
    // hunt id and puzzle id comes from route?
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
      puzzleId: PropTypes.string.isRequired,
    }).isRequired,
    puzzlesReady: PropTypes.bool.isRequired,
    allPuzzles: PropTypes.arrayOf(PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired as React.Validator<PuzzleType>).isRequired,
    allTags: PropTypes.arrayOf(PropTypes.shape(TagsSchema.asReactPropTypes()).isRequired as React.Validator<TagType>).isRequired,
    chatReady: PropTypes.bool.isRequired,
    chatMessages: PropTypes.arrayOf(PropTypes.shape(FilteredChatMessagePropTypes).isRequired).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string).isRequired,
    allGuesses: PropTypes.arrayOf(PropTypes.shape(GuessesSchema.asReactPropTypes()).isRequired as React.Validator<GuessType>).isRequired,
    document: PropTypes.shape(DocumentsSchema.asReactPropTypes()),
    canUpdate: PropTypes.bool.isRequired,
  };

  constructor(props: PuzzlePageProps) {
    super(props);
    const mode = this.calculateViewMode();

    this.state = {
      showRelated: mode.isStackable,
      isDesktop: mode.isDesktop,
      isStackable: mode.isStackable,
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.onResize);
    Meteor.call('ensureDocumentAndPermissions', this.props.params.puzzleId);
  }

  componentDidUpdate(prevProps: PuzzlePageProps) {
    if (prevProps.params.puzzleId !== this.props.params.puzzleId) {
      Meteor.call('ensureDocumentAndPermissions', this.props.params.puzzleId);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    const newMode = this.calculateViewMode();
    // If resizing into unstackable mode, switch to just chat in all cases
    if (this.state.isStackable && !newMode.isStackable) {
      this.setState({ showRelated: false });
    }
    if (newMode.isDesktop !== this.state.isDesktop || newMode.isStackable !== this.state.isStackable) {
      this.setState({
        isDesktop: newMode.isDesktop,
        isStackable: newMode.isStackable,
      });
    }
  };

  onChangeShowRelated = (showRelatedNew: boolean) => {
    this.setState({ showRelated: showRelatedNew });
  };

  // Ideally these should be based on size of the component (and the trigger changed appropriately)
  // but this component is designed for full-page use, so...
  calculateViewMode = () => {
    const newIsDesktop = window.innerWidth >= MinimumDesktopWidth;
    const newIsStackable = window.innerHeight >= (newIsDesktop ? MinimumDesktopStackingHeight : MinimumMobileStackingHeight);
    return {
      isDesktop: newIsDesktop,
      isStackable: newIsStackable,
    };
  };

  render() {
    if (!this.props.puzzlesReady) {
      return <span>loading...</span>;
    }

    const activePuzzle = findPuzzleById(this.props.allPuzzles, this.props.params.puzzleId)!;

    const sidebar = (
      <PuzzlePageSidebar
        key="sidebar"
        activePuzzle={activePuzzle}
        allPuzzles={this.props.allPuzzles}
        allTags={this.props.allTags}
        chatReady={this.props.chatReady}
        chatMessages={this.props.chatMessages}
        displayNames={this.props.displayNames}
        canUpdate={this.props.canUpdate}
        showRelated={this.state.showRelated}
        onChangeShowRelated={this.onChangeShowRelated}
        isDesktop={this.state.isDesktop}
        isStackable={this.state.isStackable}
      />
    );

    return (
      <DocumentTitle title={`${activePuzzle.title} :: Jolly Roger`}>
        {this.state.isDesktop ? (
          <div className="puzzle-page">
            <SplitPanePlus
              split="vertical"
              defaultSize={DefaultSidebarWidth}
              minSize={MinimumSidebarWidth}
              pane1Style={{ maxWidth: MaximumSidebarWidth }}
              autoCollapse1={-1}
              autoCollapse2={-1}
            >
              {sidebar}
              <PuzzlePageContent
                puzzle={activePuzzle}
                allTags={this.props.allTags}
                guesses={this.props.allGuesses}
                displayNames={this.props.displayNames}
                document={this.props.document}
                isDesktop={this.state.isDesktop}
              />
            </SplitPanePlus>
          </div>
        ) : (
          <div className="puzzle-page narrow">
            <PuzzlePageMetadataContainer
              puzzle={activePuzzle}
              allTags={this.props.allTags}
              guesses={this.props.allGuesses}
              displayNames={this.props.displayNames}
              document={this.props.document}
              isDesktop={this.state.isDesktop}
            />
            {sidebar}
          </div>
        )}
      </DocumentTitle>
    );
  }
}

const crumb = withBreadcrumb(({ params, puzzlesReady, allPuzzles }) => {
  const activePuzzle = findPuzzleById(allPuzzles, params.puzzleId)!;
  return {
    title: puzzlesReady ? activePuzzle.title : 'loading...',
    path: `/hunts/${params.huntId}/puzzles/${params.puzzleId}`,
  };
});
const tracker = withTracker(({ params }: PuzzlePageParams) => {
  // There are some model dependencies that we have to be careful about:
  //
  // * We show the displayname of the person who submitted a guess, so guesses depends on display names
  // * Chat messages show the displayname of the sender, so chatmessages depends on display names
  // * Puzzle metadata needs puzzles, tags, guesses, documents, and display names.
  //
  // We can render some things on incomplete data, but most of them really need full data:
  // * Chat can be rendered with just chat messages and display names
  // * Puzzle metadata needs puzzles, tags, documents, guesses, and display names
  // * Related puzzles probably only needs puzzles and tags, but right now it just gets the same
  //   data that the puzzle metadata gets, so it blocks maybe-unnecessarily.

  if (!Flags.active('disable.subcounters')) {
    // Keep a count of how many people are viewing a puzzle. Don't use
    // the subs manager - we don't want this cached
    Meteor.subscribe('subscribers.inc', `puzzle:${params.puzzleId}`, {
      puzzle: params.puzzleId,
      hunt: params.huntId,
    });
  }

  const displayNamesHandle = Profiles.subscribeDisplayNames(subsCache);
  let displayNames = {};
  if (displayNamesHandle.ready()) {
    displayNames = Profiles.displayNames();
  }

  const puzzlesHandle = subsCache.subscribe('mongo.puzzles', { hunt: params.huntId });
  const tagsHandle = subsCache.subscribe('mongo.tags', { hunt: params.huntId });
  const guessesHandle = subsCache.subscribe('mongo.guesses', { puzzle: params.puzzleId });
  const documentsHandle = subsCache.subscribe('mongo.documents', { puzzle: params.puzzleId });

  if (!Flags.active('disable.subcounters')) {
    subsCache.subscribe('subscribers.counts', { hunt: params.huntId });
  }

  const puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready() && displayNamesHandle.ready();

  let allPuzzles: PuzzleType[];
  let allTags: TagType[];
  let allGuesses: GuessType[];
  let document: Document | undefined;
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
  const chatHandle = subsCache.subscribe(
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
    canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.update'),
  };
});

const PuzzlePageContainer = _.compose(tracker, crumb)(PuzzlePage);
PuzzlePageContainer.propTypes = {
  // hunt id and puzzle id comes from route?
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
    puzzleId: PropTypes.string.isRequired,
  }).isRequired,
};

// Mark this page as needing fixed, fullscreen layout.
PuzzlePageContainer.desiredLayout = 'fullscreen';

export default PuzzlePageContainer;
