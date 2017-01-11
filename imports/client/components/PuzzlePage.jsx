import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import BS from 'react-bootstrap';
import Ansible from '/imports/ansible.js';
import DocumentTitle from 'react-document-title';
import classnames from 'classnames';
import marked from 'marked';
import moment from 'moment';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
import { ModalForm } from '/imports/client/components/ModalForm.jsx';
import TextareaAutosize from 'react-textarea-autosize';
import {
  TagList,
  RelatedPuzzleGroups,
  PuzzleModalForm,
} from '/imports/client/components/PuzzleComponents.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import { SubscriberCounters } from '/imports/client/subscribers.js';
import { Flags } from '/imports/flags.js';
import SplitPanePlus from '/imports/client/components/SplitPanePlus.jsx';

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

const RelatedPuzzleSection = React.createClass({
  propTypes: {
    activePuzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allPuzzles: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Puzzles.asReactPropTypes()
      ).isRequired
    ).isRequired,
    allTags: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
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
    message: React.PropTypes.shape(FilteredChatMessagePropTypes).isRequired,
    senderDisplayName: React.PropTypes.string.isRequired,
    isSystemMessage: React.PropTypes.bool.isRequired,
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
    chatMessages: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
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
    onHeightChange: React.PropTypes.func,
    onMessageSent: React.PropTypes.func,
    puzzleId: React.PropTypes.string,
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
    chatReady: React.PropTypes.bool.isRequired,
    chatMessages: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
    puzzleId: React.PropTypes.string.isRequired,
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
    activePuzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allPuzzles: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Puzzles.asReactPropTypes()
      ).isRequired
    ).isRequired,
    allTags: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    chatReady: React.PropTypes.bool.isRequired,
    chatMessages: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        FilteredChatMessagePropTypes
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
    isDesktop: React.PropTypes.bool.isRequired,
    isStackable: React.PropTypes.bool.isRequired,
    showRelated: React.PropTypes.bool.isRequired,
    onChangeShowRelated: React.PropTypes.func.isRequired,
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
          <BS.Nav bsStyle="tabs" justified onSelect={this.handleSelect}>
            <BS.NavItem
              className={!this.props.showRelated && 'active'}
              onClick={() => { this.props.onChangeShowRelated(false); }}
            >
              Chat
            </BS.NavItem>
            <BS.NavItem
              className={this.props.showRelated && 'active'}
              onClick={() => { this.props.onChangeShowRelated(true); }}
            >
              Related
            </BS.NavItem>
          </BS.Nav>
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
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allTags: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    guesses: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Guesses.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
    documents: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Documents.asReactPropTypes()
      ).isRequired,
    ).isRequired,
    isDesktop: React.PropTypes.bool.isRequired,
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
        <BS.Button onClick={this.showEditModal} bsStyle="default" bsSize="xs" title="Edit puzzle...">
          <BS.Glyphicon glyph="edit" />
        </BS.Button>
      );
    }
    return null;
  },

  render() {
    const tagsById = _.indexBy(this.props.allTags, '_id');
    const tags = this.props.puzzle.tags.map((tagId) => { return tagsById[tagId]; });
    const answerComponent = this.props.puzzle.answer ? <span className="puzzle-metadata-answer">Solved: <span className="answer">{this.props.puzzle.answer}</span></span> : null;
    const hideViewCount = this.props.puzzle.answer || Flags.active('disable.subcounters');
    const viewCountComponent = hideViewCount ? null : `(${this.data.viewCount} viewing)`;
    const googleDriveLink = this.props.documents[0] && this.props.documents[0].type === 'google-spreadsheet' ? `https://docs.google.com/spreadsheets/d/${this.props.documents[0].value.id}` : null;
    const googleDriveComponent = googleDriveLink ? <a className="puzzle-metadata-gdrive-button" href={googleDriveLink} target="_blank" rel="noreferrer noopener" >Open Worksheet</a> : <span className="puzzle-metadata-gdrive-button unavailable">(No Worksheet)</span>;
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
              {this.props.isDesktop ? (
                <span className="puzzle-metadata-title">{this.props.puzzle.title}</span>
              ) : (
                googleDriveComponent
              )}
              {' '}
              {this.props.puzzle.answer && answerComponent}
              {' '}
              {viewCountComponent}
            </div>
          </div>
          <div className="puzzle-metadata-row">
            <div className="puzzle-metadata-right">
              <BS.Button className="puzzle-metadata-guess-button" onClick={this.showGuessModal}>
                {this.props.puzzle.answer ? `View ${guessesString}` : `Submit answer (${guessesString})`}
              </BS.Button>
            </div>
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
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    guesses: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Guesses.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
    onSubmit: React.PropTypes.func,
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
      <BS.Tooltip id="guess-direction-tooltip">
        Current value: {this.state.directionInput}
      </BS.Tooltip>
    );
    const confidenceTooltip = (
      <BS.Tooltip id="guess-confidence-tooltip">
        Current value: {this.state.confidenceInput}
      </BS.Tooltip>
    );

    return (
      <ModalForm
        ref={(node) => { this.formNode = node; }}
        title={`${this.props.puzzle.answer ? 'Guess history for' : 'Submit answer to'} ${this.props.puzzle.title}`}
        onSubmit={this.onSubmitGuess}
        submitLabel={this.state.confirmingSubmit ? 'Confirm Submit' : 'Submit'}
      >
        <BS.FormGroup>
          <BS.ControlLabel htmlFor="jr-puzzle-guess" className="col-xs-3">
            Guess
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.FormControl
              type="text"
              id="jr-puzzle-guess"
              autoFocus="true"
              autoComplete="off"
              onChange={this.onGuessInputChange}
              value={this.state.guessInput}
            />
          </div>

          <BS.ControlLabel htmlFor="jr-puzzle-guess-direction" className="col-xs-3">
            Solve direction
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.OverlayTrigger placement="right" overlay={directionTooltip}>
              <BS.FormControl
                type="range"
                id="jr-puzzle-guess-direction"
                min={-10}
                max={10}
                step={1}
                onChange={this.onDirectionInputChange}
                value={this.state.directionInput}
              />
            </BS.OverlayTrigger>
            <BS.HelpBlock>
              Pick a number between -10 (backsolved without opening
              the puzzle) to 10 (forward-solved without seeing the
              round) to indicate if you forward- or back-solved.
            </BS.HelpBlock>
          </div>

          <BS.ControlLabel htmlFor="jr-puzzle-guess-confidence" className="col-xs-3">
            Confidence
          </BS.ControlLabel>
          <div className="col-xs-9">
            <BS.OverlayTrigger placement="right" overlay={confidenceTooltip}>
              <BS.FormControl
                type="range"
                id="jr-puzzle-guess-confidence"
                min={0}
                max={100}
                step={1}
                onChange={this.onConfidenceInputChange}
                value={this.state.confidenceInput}
              />
            </BS.OverlayTrigger>
            <BS.HelpBlock>
              Pick a number between 0 and 100 for the probability that
              you think this answer is right.
            </BS.HelpBlock>
          </div>
        </BS.FormGroup>

        {this.props.guesses.length === 0 ? <div>No previous submissions.</div> : [
          <div key="label">Previous submissions:</div>,
          <BS.Table key="table" bordered condensed>
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
                    <td className="answer" >{guess.guess}</td>
                    <td>{moment(guess.createdAt).calendar()}</td>
                    <td>{this.props.displayNames[guess.createdBy]}</td>
                    <td style={{ textTransform: 'capitalize' }} >{guess.state}</td>
                  </tr>
                );
              })}
            </tbody>
          </BS.Table>,
        ]}
        {this.state.confirmingSubmit ? <BS.Alert bsStyle="warning">{this.state.confirmationMessage}</BS.Alert> : null}
        {this.state.submitState === 'failed' ? <BS.Alert bsStyle="danger" onDismiss={this.clearError}>{this.state.errorMessage}</BS.Alert> : null}
      </ModalForm>
    );
  },
});

const PuzzlePageMultiplayerDocument = React.createClass({
  propTypes: {
    document: React.PropTypes.shape(Schemas.Documents.asReactPropTypes()),
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

    switch (this.props.document.type) {
      case 'google-spreadsheet': {
        const url = `https://docs.google.com/spreadsheets/d/${this.props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
        return (
          <div className="puzzle-document">
            <iframe className="google-spreadsheet" src={url} />
          </div>
        );
      }
      default:
        return (
          <div className="puzzle-document puzzle-document-message">
            No way to render a document of type {this.props.document.type}
          </div>
        );
    }
  },
});

const PuzzlePageContent = React.createClass({
  propTypes: {
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
    allTags: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      ).isRequired
    ).isRequired,
    guesses: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Guesses.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
    documents: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Documents.asReactPropTypes()
      ).isRequired,
    ).isRequired,
    isDesktop: React.PropTypes.bool.isRequired,
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
          documents={this.props.documents}
        />
        {this.props.isDesktop &&
          <PuzzlePageMultiplayerDocument document={this.props.documents[0]} />
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
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
      puzzleId: React.PropTypes.string.isRequired,
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
      Meteor.subscribe('subCounter.inc', `puzzle:${this.props.params.puzzleId}`, {
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
      this.context.subs.subscribe('subCounter.fetch', { hunt: this.props.params.huntId });
    }

    const puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready() && displayNamesHandle.ready();

    let allPuzzles;
    let allTags;
    let allGuesses;
    let allDocuments;
    // There's no sense in doing this expensive computation here if we're still loading data,
    // since we're not going to render the children.
    if (puzzlesReady) {
      allPuzzles = Models.Puzzles.find({ hunt: this.props.params.huntId }).fetch();
      allTags = Models.Tags.find({ hunt: this.props.params.huntId }).fetch();
      allGuesses = Models.Guesses.find({ hunt: this.props.params.huntId, puzzle: this.props.params.puzzleId }).fetch();

      // Sort by created at so that the "first" document always has consistent meaning
      allDocuments = Models.Documents.find({ puzzle: this.props.params.puzzleId }, { sort: { createdAt: 1 } }).fetch();
    } else {
      allPuzzles = [];
      allTags = [];
      allGuesses = [];
      allDocuments = [];
    }

    const chatFields = {};
    FilteredChatFields.forEach(f => { chatFields[f] = 1; });
    const chatHandle = this.context.subs.subscribe(
      'mongo.chatmessages',
      { puzzle: this.props.params.puzzleId },
      { fields: chatFields });

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
      allDocuments,
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
                documents={this.data.allDocuments}
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
              documents={this.data.allDocuments}
              isDesktop={this.state.isDesktop}
            />
            {sidebar}
          </div>
        )}
      </DocumentTitle>
    );
  },
});

export { PuzzlePage };
