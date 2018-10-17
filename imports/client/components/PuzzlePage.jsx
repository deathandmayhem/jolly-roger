import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
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
import classnames from 'classnames';
import marked from 'marked';
import moment from 'moment';
import TextareaAutosize from 'react-textarea-autosize';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import Ansible from '../../ansible.js';
import JRPropTypes from '../JRPropTypes.js';
import navAggregatorType from './navAggregatorType.jsx';
import ModalForm from './ModalForm.jsx';
import PuzzleModalForm from './PuzzleModalForm.jsx';
import RelatedPuzzleGroups from './RelatedPuzzleGroups.jsx';
import TagList from './TagList.jsx';
import { Subscribers, SubscriberCounters } from '../subscribers.js';
import Flags from '../../flags.js';
import SplitPanePlus from './SplitPanePlus.jsx';
import DocumentDisplay from './Documents.jsx';

/* eslint-disable max-len, no-console */

const FilteredChatFields = ['puzzle', 'text', 'sender', 'timestamp'];
const FilteredChatMessagePropTypes = _.pick(Schemas.ChatMessages.asReactPropTypes(), ...FilteredChatFields);

const MinimumDesktopWidth = 600;
const MinimumDesktopStackingHeight = 400; // In two column mode, allow stacking at smaller heights
const MinimumMobileStackingHeight = 740; // Captures iPhone Plus but not iPad Mini
const MinimumSidebarWidth = 150;
const MaximumSidebarWidth = '75%';
const MinimumChatHeight = 96;

const DefaultSidebarWidth = 300;
const DefaultChatHeight = '60%';

const ViewersList = React.createClass({
  propTypes: {
    name: PropTypes.string.isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    // Don't want this subscription persisting longer than necessary
    const subscribersHandle = Meteor.subscribe('subscribers.fetch', this.props.name);
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');

    const ready = subscribersHandle.ready() && profilesHandle.ready();
    if (!ready) {
      return { ready };
    }

    let unknown = 0;
    const subscribers = [];

    Subscribers.find({ name: this.props.name }).forEach((s) => {
      if (!s.user) {
        unknown += 1;
        return;
      }

      const profile = Models.Profiles.findOne(s.user);
      if (!profile || !profile.displayName) {
        unknown += 1;
        return;
      }

      subscribers.push({ user: s.user, name: profile.displayName });
    });

    return { ready, unknown, subscribers };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

    return (
      <div>
        <ul>
          {this.data.subscribers.map(s => <li key={s.user}>{s.name}</li>)}
        </ul>
        {this.data.unknown !== 0 && `(Plus ${this.data.unknown} hunters with no name set)`}
      </div>
    );
  },
});

const ViewersModal = React.createClass({
  propTypes: {
    name: PropTypes.string.isRequired,
  },

  getInitialState() {
    return { show: false };
  },

  show() {
    this.setState({ show: true });
  },

  close() {
    this.setState({ show: false });
  },

  render() {
    return (
      <Modal show={this.state.show} onHide={this.close}>
        <Modal.Header closeButton>
          <Modal.Title>
            Currently viewing this puzzle
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.state.show && <ViewersList name={this.props.name} />}
        </Modal.Body>
      </Modal>
    );
  },
});

const ViewCountDisplay = React.createClass({
  propTypes: {
    count: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    return {
      subfetchesDisabled: Flags.active('disable.subfetches'),
    };
  },

  showModal() {
    this.modalNode.show();
  },

  render() {
    const text = `(${this.props.count} viewing)`;
    if (this.data.subfetchesDisabled) {
      return <span>{text}</span>;
    }

    const tooltip = (
      <Tooltip id="view-count-tooltip">
        Click to see who is viewing this puzzle
      </Tooltip>
    );

    return (
      <span>
        <ViewersModal ref={(n) => { this.modalNode = n; }} name={this.props.name} />
        <OverlayTrigger placement="top" overlay={tooltip}>
          <span className="view-count" onClick={this.showModal}>{text}</span>
        </OverlayTrigger>
      </span>
    );
  },
});

const RelatedPuzzleSection = React.createClass({
  propTypes: {
    activePuzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allPuzzles: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Puzzles.asReactPropTypes()
      ).isRequired
    ).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    canUpdate: PropTypes.bool.isRequired,
  },
  mixins: [PureRenderMixin],
  render() {
    return (
      <div className="related-puzzles-section">
        <div>Related puzzles:</div>
        <RelatedPuzzleGroups
          activePuzzle={this.props.activePuzzle}
          allPuzzles={this.props.allPuzzles}
          allTags={this.props.allTags}
          canUpdate={this.props.canUpdate}
          layout="table"
        />
      </div>
    );
  },
});

const ChatMessage = React.createClass({
  propTypes: {
    message: PropTypes.shape(FilteredChatMessagePropTypes).isRequired,
    senderDisplayName: PropTypes.string.isRequired,
    isSystemMessage: PropTypes.bool.isRequired,
  },

  mixins: [PureRenderMixin],

  render() {
    const ts = moment(this.props.message.timestamp).calendar(null, {
      sameDay: 'LT',
    });
    const classes = classnames('chat-message', this.props.isSystemMessage && 'system-message');

    return (
      <div className={classes}>
        <span className="chat-timestamp">{ts}</span>
        <strong>{this.props.senderDisplayName}</strong>
        <span dangerouslySetInnerHTML={{ __html: marked(this.props.message.text, { sanitize: true }) }} />
      </div>
    );
  },
});

const ChatHistory = React.createClass({
  propTypes: {
    chatMessages: PropTypes.arrayOf(
      PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  },

  mixins: [PureRenderMixin],

  componentDidMount() {
    // Scroll to end of chat.
    this.forceScrollBottom();

    // Make sure when the window is resized, we stick to the bottom if we were there
    this.resizeHandler = () => {
      this.maybeForceScrollBottom();
    };

    window.addEventListener('resize', this.resizeHandler);
  },

  componentWillUpdate() {
    this.saveShouldScroll();
  },

  componentDidUpdate() {
    this.maybeForceScrollBottom();
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeHandler);
  },

  onScroll() {
    this.saveShouldScroll();
  },

  saveShouldScroll() {
    // Save whether the current scrollTop is equal to the ~maximum scrollTop.
    // If so, then we should make the log "stick" to the bottom, by manually scrolling to the bottom
    // when needed.
    const messagePane = this.node;

    // Include a 5 px fudge factor to account for bad scrolling and
    // fractional pixels
    this.shouldScroll = (messagePane.clientHeight + messagePane.scrollTop + 5 >= messagePane.scrollHeight);
  },

  maybeForceScrollBottom() {
    if (this.shouldScroll) {
      this.forceScrollBottom();
    }
  },

  forceScrollBottom() {
    const messagePane = this.node;
    messagePane.scrollTop = messagePane.scrollHeight;
    this.shouldScroll = true;
  },

  render() {
    return (
      <div ref={(node) => { this.node = node; }} className="chat-history" onScroll={this.onScroll}>
        {this.props.chatMessages.length === 0 && <span key="no-message">No chatter yet. Say something?</span>}
        {this.props.chatMessages.map((msg) => {
          const displayName = (msg.sender !== undefined) ? this.props.displayNames[msg.sender] : 'jolly-roger';
          return (
            <ChatMessage
              key={msg._id}
              message={msg}
              senderDisplayName={displayName}
              isSystemMessage={msg.sender === undefined}
            />
          );
        })}
      </div>
    );
  },
});

const ChatInput = React.createClass({
  propTypes: {
    onHeightChange: PropTypes.func,
    onMessageSent: PropTypes.func,
    puzzleId: PropTypes.string,
  },

  mixins: [PureRenderMixin],

  getInitialState() {
    return {
      text: '',
      height: 38,
    };
  },

  onInputChanged(e) {
    this.setState({
      text: e.target.value,
    });
  },

  onKeyDown(e) {
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
  },

  onHeightChange(newHeight) {
    if (this.props.onHeightChange) {
      this.props.onHeightChange(newHeight);
    }
  },

  styles: {
    textarea: {
      // Chrome has a bug where if the line-height is a plain number (e.g. 1.42857143) rather than
      // an absolute size (e.g. 14px, 12pt) then when you zoom, scrollHeight is miscomputed.
      // scrollHeight is used for computing the effective size of a textarea, so we can grow the
      // input to accomodate its contents.
      // The default Chrome stylesheet has line-height set to a plain number.
      // We work around the Chrome bug by setting an explicit sized line-height for the textarea.
      lineHeight: '14px',
      flex: 'none',
      padding: '9px',
      resize: 'none',
      maxHeight: '200px',
    },
  },

  render() {
    return (
      <TextareaAutosize
        style={this.styles.textarea}
        maxLength="4000"
        minRows={1}
        maxRows={12}
        value={this.state.text}
        onChange={this.onInputChanged}
        onKeyDown={this.onKeyDown}
        onHeightChange={this.onHeightChange}
        placeholder="Chat"
      />
    );
  },
});

const ChatSection = React.createClass({
  propTypes: {
    chatReady: PropTypes.bool.isRequired,
    chatMessages: PropTypes.arrayOf(
      PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    puzzleId: PropTypes.string.isRequired,
  },

  mixins: [PureRenderMixin],

  onInputHeightChange() {
    this.historyNode.maybeForceScrollBottom();
  },

  onMessageSent() {
    this.historyNode.forceScrollBottom();
  },

  render() {
    return (
      <div className="chat-section">
        {this.props.chatReady ? null : <span>loading...</span>}
        <ChatHistory ref={(node) => { this.historyNode = node; }} chatMessages={this.props.chatMessages} displayNames={this.props.displayNames} />
        <ChatInput
          puzzleId={this.props.puzzleId}
          onHeightChange={this.onInputHeightChange}
          onMessageSent={this.onMessageSent}
        />
      </div>
    );
  },
});

const PuzzlePageSidebar = React.createClass({
  propTypes: {
    activePuzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allPuzzles: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Puzzles.asReactPropTypes()
      ).isRequired
    ).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
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
  },
  mixins: [PureRenderMixin],

  onCollapseChanged(collapsed) {
    this.props.onChangeShowRelated(collapsed !== 1);
  },

  render() {
    let collapse = 0;
    if (this.props.isStackable) {
      collapse = this.props.showRelated ? 0 : 1;
    } else {
      collapse = this.props.showRelated ? 2 : 1;
    }
    const classes = classnames('sidebar', { stackable: this.props.isStackable });
    return (
      <div className={classes}>
        {!this.props.isStackable && (
          <Nav bsStyle="tabs" justified onSelect={this.handleSelect}>
            <NavItem
              className={!this.props.showRelated && 'active'}
              onClick={() => { this.props.onChangeShowRelated(false); }}
            >
              Chat
            </NavItem>
            <NavItem
              className={this.props.showRelated && 'active'}
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
              canUpdate={this.props.canUpdate}
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
  },
});

const PuzzlePageMetadata = React.createClass({
  propTypes: {
    puzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Guesses.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    document: PropTypes.shape(Schemas.Documents.asReactPropTypes()),
    isDesktop: PropTypes.bool.isRequired,
  },

  mixins: [ReactMeteorData],

  onCreateTag(newTagName) {
    Meteor.call('addTagToPuzzle', this.props.puzzle._id, newTagName, (error) => {
      // Not really much we can do in the case of a failure, but let's log it anyway
      if (error) {
        console.log('failed to create tag:');
        console.log(error);
      }
    });
  },

  onRemoveTag(tagIdToRemove) {
    Meteor.call('removeTagFromPuzzle', this.props.puzzle._id, tagIdToRemove, (error) => {
      // Not really much we can do in the case of a failure, but again, let's log it anyway
      if (error) {
        console.log('failed to remove tag:');
        console.log(error);
      }
    });
  },

  onEdit(state, callback) {
    Ansible.log('Updating puzzle properties', { puzzle: this.props.puzzle._id, user: Meteor.userId(), state });
    Meteor.call('updatePuzzle', this.props.puzzle._id, state, callback);
  },

  getMeteorData() {
    const count = SubscriberCounters.findOne(`puzzle:${this.props.puzzle._id}`);
    return {
      subcountersDisabled: Flags.active('disable.subcounters'),
      viewCount: count ? count.value : 0,
      canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.update'),
    };
  },

  showGuessModal() {
    this.guessModalNode.show();
  },

  showEditModal() {
    this.editModalNode.show();
  },

  editButton() {
    if (this.data.canUpdate) {
      return (
        <Button onClick={this.showEditModal} bsStyle="default" bsSize="xs" title="Edit puzzle...">
          <Glyphicon glyph="edit" />
        </Button>
      );
    }
    return null;
  },

  render() {
    const tagsById = _.indexBy(this.props.allTags, '_id');
    const tags = this.props.puzzle.tags.map((tagId) => { return tagsById[tagId]; });
    const isAdministrivia = _.findWhere(tags, { name: 'administrivia' });
    const answerComponent = this.props.puzzle.answer ? (
      <span className="puzzle-metadata-answer">
        Solved:
        {' '}
        <span className="answer">{this.props.puzzle.answer}</span>
      </span>
    ) : null;
    const hideViewCount = this.props.puzzle.answer || this.data.subcountersDisabled;
    const guessesString = `${this.props.guesses.length ? this.props.guesses.length : 'no'} guesses`;
    return (
      <div className="puzzle-metadata">
        <PuzzleModalForm
          ref={(node) => { this.editModalNode = node; }}
          puzzle={this.props.puzzle}
          huntId={this.props.puzzle.hunt}
          tags={this.props.allTags}
          onSubmit={this.onEdit}
        />
        <div>
          <div className="puzzle-metadata-row">
            <div className="puzzle-metadata-right">
              {this.props.puzzle.url && (
                <a
                  className="puzzle-metadata-external-link-button"
                  href={this.props.puzzle.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Puzzle
                </a>
              )}
            </div>
            <div className="puzzle-metadata-left">
              {this.editButton()}
              {' '}
              {this.props.isDesktop &&
                <span className="puzzle-metadata-title">{this.props.puzzle.title}</span>}
              {!this.props.isDesktop && this.props.document &&
                <DocumentDisplay document={this.props.document} displayMode="link" />}
              {' '}
              {this.props.puzzle.answer && answerComponent}
              {' '}
              {!hideViewCount && (
                <ViewCountDisplay
                  count={this.data.viewCount}
                  name={`puzzle:${this.props.puzzle._id}`}
                />
              )}
            </div>
          </div>
          <div className="puzzle-metadata-row">
            {!isAdministrivia && (
              <div className="puzzle-metadata-right">
                <Button className="puzzle-metadata-guess-button" onClick={this.showGuessModal}>
                  {this.props.puzzle.answer ? `View ${guessesString}` : `Submit answer (${guessesString})`}
                </Button>
              </div>
            )}
            <div className="puzzle-metadata-left">
              <span className="puzzle-metadata-tags">Tags:</span>
              <TagList
                puzzleId={this.props.puzzle._id}
                tags={tags}
                onCreateTag={this.onCreateTag}
                onRemoveTag={this.onRemoveTag}
                linkToSearch={false}
                showControls={this.props.isDesktop}
              />
            </div>
          </div>
        </div>
        <PuzzleGuessModal
          ref={(node) => { this.guessModalNode = node; }}
          puzzle={this.props.puzzle}
          guesses={this.props.guesses}
          displayNames={this.props.displayNames}
        />
      </div>
    );
  },
});

const PuzzleGuessModal = React.createClass({
  propTypes: {
    puzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Guesses.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    onSubmit: PropTypes.func,
  },

  getInitialState() {
    return {
      guessInput: '',
      directionInput: 0,
      confidenceInput: 50,
      submitState: 'idle',
      confirmingSubmit: false,
      confirmationMessage: '',
      errorMessage: '',
    };
  },

  onGuessInputChange(event) {
    this.setState({
      guessInput: event.target.value.toUpperCase(),
      confirmingSubmit: false,
    });
  },

  onDirectionInputChange(event) {
    this.setState({ directionInput: parseInt(event.target.value, 10) });
  },

  onConfidenceInputChange(event) {
    this.setState({ confidenceInput: parseInt(event.target.value, 10) });
  },

  onSubmitGuess() {
    const repeatGuess = _.find(this.props.guesses, (g) => { return g.guess === this.state.guessInput; });
    const alreadySolved = this.props.puzzle.answer;
    if ((repeatGuess || alreadySolved) && !this.state.confirmingSubmit) {
      const repeatGuessStr = repeatGuess ? 'This answer has already been submitted. ' : '';
      const alreadySolvedStr = alreadySolved ? 'This puzzle has already been solved. ' : '';
      const msg = `${alreadySolvedStr} ${repeatGuessStr} Are you sure you want to submit this guess?`;
      this.setState({
        confirmingSubmit: true,
        confirmationMessage: msg,
      });
    } else {
      Meteor.call(
        'addGuessForPuzzle',
        this.props.puzzle._id,
        this.state.guessInput,
        this.state.directionInput,
        this.state.confidenceInput,
        (error) => {
          if (error) {
            this.setState({
              submitState: 'failed',
              errorMessage: error.message,
            });
            console.log(error);
          }

          // Clear the input box.  Don't dismiss the dialog.
          this.setState({
            guessInput: '',
            confirmingSubmit: false,
          });
        },
      );
    }
  },

  clearError() {
    this.setState({
      submitState: 'idle',
      errorMessage: '',
    });
  },

  show() {
    this.formNode.show();
  },

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
        ref={(node) => { this.formNode = node; }}
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
              autoFocus="true"
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
        {this.state.submitState === 'failed' ? <Alert bsStyle="danger" onDismiss={this.clearError}>{this.state.errorMessage}</Alert> : null}
      </ModalForm>
    );
  },
});

const PuzzlePageMultiplayerDocument = React.createClass({
  propTypes: {
    document: PropTypes.shape(Schemas.Documents.asReactPropTypes()),
  },

  mixins: [PureRenderMixin],

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
  },
});

const PuzzlePageContent = React.createClass({
  propTypes: {
    puzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Guesses.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    document: PropTypes.shape(Schemas.Documents.asReactPropTypes()),
    isDesktop: PropTypes.bool.isRequired,
  },
  mixins: [PureRenderMixin],
  render() {
    return (
      <div className="puzzle-content">
        <PuzzlePageMetadata
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
  },
});

const findPuzzleById = function (puzzles, id) {
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    if (puzzle._id === id) {
      return puzzle;
    }
  }

  return undefined;
};

const PuzzlePage = React.createClass({
  propTypes: {
    // hunt id and puzzle id comes from route?
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
      puzzleId: PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  statics: {
    // Mark this page as needing fixed, fullscreen layout.
    desiredLayout: 'fullscreen',
  },

  getInitialState() {
    const mode = this.calculateViewMode();
    // To-Do: Per user interfaceOption defaults
    return {
      showRelated: mode.isStackable,
      isDesktop: mode.isDesktop,
      isStackable: mode.isStackable,
    };
  },

  componentWillMount() {
    Meteor.call('ensureDocumentAndPermissions', this.props.params.puzzleId);
  },

  componentDidMount() {
    window.addEventListener('resize', this.onResize);
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.puzzleId !== this.props.params.puzzleId) {
      Meteor.call('ensureDocumentAndPermissions', nextProps.params.puzzleId);
    }
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  },

  onResize() {
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
  },

  onChangeShowRelated(showRelatedNew) {
    this.setState({ showRelated: showRelatedNew });
  },

  getMeteorData() {
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
      Meteor.subscribe('subscribers.inc', `puzzle:${this.props.params.puzzleId}`, {
        puzzle: this.props.params.puzzleId,
        hunt: this.props.params.huntId,
      });
    }

    const displayNamesHandle = Models.Profiles.subscribeDisplayNames(this.context.subs);
    let displayNames = {};
    if (displayNamesHandle.ready()) {
      displayNames = Models.Profiles.displayNames();
    }

    const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', { hunt: this.props.params.huntId });
    const tagsHandle = this.context.subs.subscribe('mongo.tags', { hunt: this.props.params.huntId });
    const guessesHandle = this.context.subs.subscribe('mongo.guesses', { puzzle: this.props.params.puzzleId });
    const documentsHandle = this.context.subs.subscribe('mongo.documents', { puzzle: this.props.params.puzzleId });

    if (!Flags.active('disable.subcounters')) {
      this.context.subs.subscribe('subscribers.counts', { hunt: this.props.params.huntId });
    }

    const puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready() && displayNamesHandle.ready();

    let allPuzzles;
    let allTags;
    let allGuesses;
    let document;
    // There's no sense in doing this expensive computation here if we're still loading data,
    // since we're not going to render the children.
    if (puzzlesReady) {
      allPuzzles = Models.Puzzles.find({ hunt: this.props.params.huntId }).fetch();
      allTags = Models.Tags.find({ hunt: this.props.params.huntId }).fetch();
      allGuesses = Models.Guesses.find({ hunt: this.props.params.huntId, puzzle: this.props.params.puzzleId }).fetch();

      // Sort by created at so that the "first" document always has consistent meaning
      document = Models.Documents.findOne({ puzzle: this.props.params.puzzleId }, { sort: { createdAt: 1 } });
    } else {
      allPuzzles = [];
      allTags = [];
      allGuesses = [];
      document = [];
    }

    const chatFields = {};
    FilteredChatFields.forEach((f) => { chatFields[f] = 1; });
    const chatHandle = this.context.subs.subscribe(
      'mongo.chatmessages',
      { puzzle: this.props.params.puzzleId },
      { fields: chatFields }
    );

    // Chat is not ready until chat messages and display names have loaded, but doesn't care about any
    // other collections.
    const chatReady = chatHandle.ready() && displayNamesHandle.ready();
    const chatMessages = (chatReady && Models.ChatMessages.find(
      { puzzle: this.props.params.puzzleId },
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
  },

  // Ideally these should be based on size of the component (and the trigger changed appropriately)
  // but this component is designed for full-page use, so...
  calculateViewMode() {
    const newIsDesktop = window.innerWidth >= MinimumDesktopWidth;
    const newIsStackable = window.innerHeight >= (newIsDesktop ? MinimumDesktopStackingHeight : MinimumMobileStackingHeight);
    return {
      isDesktop: newIsDesktop,
      isStackable: newIsStackable,
    };
  },

  render() {
    if (!this.data.puzzlesReady) {
      return <span>loading...</span>;
    }

    const activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);

    const navItem = (
      <this.context.navAggregator.NavItem
        itemKey="puzzleid"
        to={`/hunts/${this.props.params.huntId}/puzzles/${this.props.params.puzzleId}`}
        label={activePuzzle.title}
      />
    );
    const sidebar = (
      <PuzzlePageSidebar
        key="sidebar"
        activePuzzle={activePuzzle}
        allPuzzles={this.data.allPuzzles}
        allTags={this.data.allTags}
        chatReady={this.data.chatReady}
        chatMessages={this.data.chatMessages}
        displayNames={this.data.displayNames}
        canUpdate={this.data.canUpdate}
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
            {navItem}
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
                allTags={this.data.allTags}
                guesses={this.data.allGuesses}
                displayNames={this.data.displayNames}
                document={this.data.document}
                isDesktop={this.state.isDesktop}
              />
            </SplitPanePlus>
          </div>
        ) : (
          <div className="puzzle-page narrow">
            {navItem}
            <PuzzlePageMetadata
              puzzle={activePuzzle}
              allTags={this.data.allTags}
              guesses={this.data.allGuesses}
              displayNames={this.data.displayNames}
              document={this.data.document}
              isDesktop={this.state.isDesktop}
            />
            {sidebar}
          </div>
        )}
      </DocumentTitle>
    );
  },
});

export default PuzzlePage;
