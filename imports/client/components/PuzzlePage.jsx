import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import BS from 'react-bootstrap';
import Ansible from '/imports/ansible.js';
import { Link } from 'react-router';
import DocumentTitle from 'react-document-title';
import marked from 'marked';
import moment from 'moment';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
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
import SplitPane from 'react-split-pane';
import classNames from 'classnames';

/* eslint-disable max-len, no-console */

const FilteredChatFields = ['puzzle', 'text', 'sender', 'timestamp'];
const FilteredChatMessagePropTypes = _.pick(Schemas.ChatMessages.asReactPropTypes(), ...FilteredChatFields);

const MinimumDesktopWidth = 600;
const DefaultSidebarWidth = 300;
const DefaultChatHeight = 400;
const CollapseThreshold = 60;

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
        />
      </div>
    );
  },
});

const ChatMessage = React.createClass({
  propTypes: {
    message: React.PropTypes.shape(FilteredChatMessagePropTypes).isRequired,
    senderDisplayName: React.PropTypes.string.isRequired,
  },

  mixins: [PureRenderMixin],

  render() {
    const ts = moment(this.props.message.timestamp).calendar(null, {
      sameDay: 'LT',
    });

    return (
      <div className="chat-message">
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
        {this.props.chatMessages.map((msg) => <ChatMessage key={msg._id} message={msg} senderDisplayName={this.props.displayNames[msg.sender]} />)}
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
    isDesktop: React.PropTypes.bool,
    interfaceOptions: React.PropTypes.object.isRequired,
    updateInterfaceOptions: React.PropTypes.func.isRequired,
  },
  mixins: [PureRenderMixin],
  getDefaultProps() {
    return {
      isDesktop: true,
    };
  },
  getInitialState() {
    return {
      collapseChatWarning: false,
      collapseRelatedWarning: false,
    };
  },
  render() {
    const adjustable = this.props.interfaceOptions.showChat && this.props.interfaceOptions.showRelated;
    const expandedChatSize = this.props.interfaceOptions.showChat ? '100%' : '0%';
    const chatSize = adjustable ? this.props.interfaceOptions.chatHeight : expandedChatSize;
    const splitClasses = classNames('sidebar-splitpane', { closed: !adjustable }, { collapsing1: this.state.collapseRelatedWarning }, { collapsing2: this.state.collapseChatWarning });
    const splitDragFinished = (size) => {
      const otherPaneSize = document.getElementsByClassName('sidebar-splitpane')[0].firstChild.clientHeight;
      if (size <= CollapseThreshold) {
        this.props.updateInterfaceOptions({ showChat: false });
      } else if (otherPaneSize <= CollapseThreshold) {
        this.props.updateInterfaceOptions({ showRelated: false });
      } else {
        this.props.updateInterfaceOptions({ chatHeight: size });
      }
      this.setState({ collapseChatWarning: false });
      this.setState({ collapseRelatedWarning: false });
    };
    const splitDragChange = (size) => {
      const otherPaneSize = document.getElementsByClassName('sidebar-splitpane')[0].firstChild.clientHeight;
      this.setState({ collapseChatWarning: size <= CollapseThreshold });
      this.setState({ collapseRelatedWarning: otherPaneSize <= CollapseThreshold });
    };

    return (
      <div className="sidebar">
        <SplitPane split="horizontal" primary="second" className={splitClasses} size={chatSize} maxSize={0} allowResize={adjustable} onDragFinished={splitDragFinished} onChange={splitDragChange}>
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
        </SplitPane>
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
    isDesktop: React.PropTypes.bool,
    interfaceOptions: React.PropTypes.object.isRequired,
    updateInterfaceOptions: React.PropTypes.func.isRequired,
  },

  mixins: [ReactMeteorData],

  getDefaultProps() {
    return {
      isDesktop: true,
    };
  },

  getInitialState() {
    return {
      guessInput: '',
      submitState: 'idle',
      errorMessage: '',
    };
  },

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

  onGuessInputChange(event) {
    this.setState({
      guessInput: event.target.value,
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
    this.formNode.show();
  },

  showEditModal() {
    this.editModalNode.show();
  },

  dismissModal() {
    this.formNode.close();
  },

  submitGuess() {
    Meteor.call('addGuessForPuzzle', this.props.puzzle._id, this.state.guessInput, (error) => {
      // TODO: dismiss the modal on success?  show error message on failure?
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
      });
    });
  },

  clearError() {
    this.setState({
      submitState: 'idle',
      errorMessage: '',
    });
  },

  daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  formatDate(date) {
    // We only care about days in so far as which day of hunt this guess was submitted on
    const day = this.daysOfWeek[date.getDay()];
    return `${day}, ${date.toLocaleTimeString()}`;
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
    const _this = this;
    const tagsById = _.indexBy(this.props.allTags, '_id');
    const tags = this.props.puzzle.tags.map((tagId) => { return tagsById[tagId]; });
    const answerComponent = this.props.puzzle.answer ? <span className="puzzle-metadata-answer">{`Solved: ${this.props.puzzle.answer}`}</span> : null;
    const hideViewCount = this.props.puzzle.answer || Flags.active('disable.subcounters');
    const viewCountComponent = hideViewCount ? null : `(${this.data.viewCount} viewing)`;
    const externalLinkComponent = this.props.puzzle.url ? <div className="puzzle-metadata-right"><a target="_blank" rel="noopener noreferrer" href={this.props.puzzle.url}>Puzzle link</a></div> : null;
    const googleDriveLink = this.props.documents[0] && this.props.documents[0].type === 'google-spreadsheet' ? 'https://docs.google.com/spreadsheets/d/${this.props.document.value.id}' : null;
    return (
      <div className="puzzle-metadata">
        <PuzzleModalForm
          ref={(node) => { this.editModalNode = node; }}
          puzzle={this.props.puzzle}
          huntId={this.props.puzzle.hunt}
          tags={this.props.allTags}
          onSubmit={this.onEdit}
        />
        <div className="puzzle-metadata-row">
          {externalLinkComponent}
          <div className="puzzle-metadata-left">
            <Link to={`/hunts/${this.props.puzzle.hunt}/puzzles`}>Puzzles</Link>
            {' / '}
            <strong>{this.props.puzzle.title}</strong>
            {' '}
            {this.editButton()}
            {viewCountComponent}
            {answerComponent}
          </div>
        </div>
        <div className="puzzle-metadata-row">
          <div className="puzzle-metadata-right">
            <BS.Button className="puzzle-metadata-guess-button" onClick={this.showGuessModal}>
              Submit answer
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
            />
          </div>
        </div>
        <div className="puzzle-metadata-row">
          {!this.props.isDesktop &&
            <div className="puzzle-metadata-right">
              { googleDriveLink ? (
                <BS.Button className="puzzle-metadata-gdrive-button" onClick={(event) => { event.preventDefault(); window.open(googleDriveLink); }}> {/* Surely there's a less ridiculous way to do this */}
                  Open in Google Drive
                </BS.Button>
              ) : (
                'No Google Drive Document Available'
              ) }
            </div>
          }
          <div className="puzzle-metadata-left">
            <input type="checkbox" autoComplete="off" checked={this.props.interfaceOptions.showChat} onChange={(e) => { this.props.updateInterfaceOptions({ showChat: e.target.checked }); }} /> Chat
            &nbsp;
            <input type="checkbox" autoComplete="off" checked={this.props.interfaceOptions.showRelated} onChange={(e) => { this.props.updateInterfaceOptions({ showRelated: e.target.checked }); }} /> Related Puzzles
          </div>
        </div>
        {/* Activity tracking not implemented yet.
            <div>Other hunters currently viewing this page?</div> */}
        <ModalForm
          ref={(node) => { this.formNode = node; }}
          title={`Submit answer to ${this.props.puzzle.title}`}
          onSubmit={this.submitGuess}
          submitLabel="Submit"
        >
          {/* TODO: make this show past guesses */}

          <BS.FormGroup>
            <BS.ControlLabel htmlFor="jr-puzzle-guess" className="col-xs-2">
              Guess
            </BS.ControlLabel>
            <div className="col-xs-10">
              <BS.FormControl
                type="text"
                id="jr-puzzle-guess"
                autoFocus="true"
                onChange={this.onGuessInputChange}
                value={this.state.guessInput}
              />
            </div>
          </BS.FormGroup>

          {this.props.guesses.length === 0 ? <div>No previous submissions.</div> : [
            <div key="label">Previous submissions:</div>,
            <BS.Table key="table" striped bordered condensed hover>
              <thead>
                <tr>
                  <th>Guess</th>
                  <th>Time</th>
                  <th>Submitter</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {this.props.guesses.map((guess) => {
                  return (
                    <tr key={guess._id}>
                      <td>{guess.guess}</td>
                      <td>{_this.formatDate(guess.createdAt)}</td>
                      <td>{_this.props.displayNames[guess.createdBy]}</td>
                      <td>{guess.state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </BS.Table>,
          ]}
          {this.state.submitState === 'failed' ? <BS.Alert bsStyle="danger" onDismiss={this.clearError}>{this.state.errorMessage}</BS.Alert> : null}
        </ModalForm>
      </div>
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
    isDesktop: React.PropTypes.bool,
    interfaceOptions: React.PropTypes.object.isRequired,
    updateInterfaceOptions: React.PropTypes.func.isRequired,
  },
  mixins: [PureRenderMixin],
  getDefaultProps() {
    return {
      isDesktop: true,
    };
  },
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
          interfaceOptions={this.props.interfaceOptions}
          updateInterfaceOptions={this.props.updateInterfaceOptions}
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
  },

  mixins: [ReactMeteorData],

  statics: {
    // Mark this page as needing fixed, fullscreen layout.
    desiredLayout: 'fullscreen',
  },

  getInitialState() {
    return {
      interfaceOptions: {
        showChat: true,
        showRelated: true,
        sidebarWidth: DefaultSidebarWidth,
        chatHeight: DefaultChatHeight,
      },
      collapseSidebarWarning: false,
    };
  },

  componentWillMount() {
    this.updateIsDesktop();
    Meteor.call('ensureDocumentAndPermissions', this.props.params.puzzleId);
  },

  componentDidMount() {
    window.addEventListener('resize', this.updateIsDesktop);
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.puzzleId !== this.props.params.puzzleId) {
      Meteor.call('ensureDocumentAndPermissions', nextProps.params.puzzleId);
    }
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateIsDesktop);
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

  updateIsDesktop() {
    const newIsDesktop = (window.innerWidth >= MinimumDesktopWidth);
    if (this.state === null || !('isDesktop' in this.state) || (newIsDesktop !== this.state.isDesktop)) { /* Prevent pointless re-rendering */
      this.setState({ isDesktop: newIsDesktop });
      /* If resizing into mobile mode with all sidebars disabled, enable chat */
      if (!newIsDesktop && !this.state.interfaceOptions.showChat && !this.state.interfaceOptions.showRelated) {
        this.updateInterfaceOptions({ showChat: true });
      }
    }
  },

  updateInterfaceOptions(opts) {
    const newOptions = {};
    Object.keys(this.state.interfaceOptions).forEach((key) => {
      newOptions[key] = (key in opts) ? opts[key] : this.state.interfaceOptions[key];
    });
    /* If in mobile mode with all sidebars disabled, enable the opposite one that used to be enabled, or default to chat */
    if (!this.state.isDesktop && !newOptions.showChat && !newOptions.showRelated) {
      if (this.state.interfaceOptions.showChat) {
        newOptions.showRelated = true;
      } else {
        newOptions.showChat = true;
      }
    }
    this.setState({ interfaceOptions: newOptions });
  },

  render() {
    if (!this.data.puzzlesReady) {
      return <span>loading...</span>;
    }

    const activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);
    const showSidebar = this.state.interfaceOptions.showChat || this.state.interfaceOptions.showRelated;
    const sidebarSize = showSidebar ? this.state.interfaceOptions.sidebarWidth : '0%';
    const splitClasses = classNames('puzzle-page', { closed: !showSidebar }, { collapsing1: this.state.collapseSidebarWarning });
    const sidebarDragFinished = (size) => {
      if (size <= CollapseThreshold) {
        this.updateInterfaceOptions({ showChat: false, showRelated: false });
      } else {
        this.updateInterfaceOptions({ sidebarWidth: size });
      }
      this.setState({ collapseSidebarWarning: false });
    };
    const sidebarDragChange = (size) => {
      this.setState({ collapseSidebarWarning: size <= CollapseThreshold });
    };

    return (
      <DocumentTitle title={`${activePuzzle.title} :: Jolly Roger`}>
        {this.state.isDesktop ? (
          <SplitPane split="vertical" className={splitClasses} size={sidebarSize} maxSize={0} allowResize={showSidebar} onDragFinished={sidebarDragFinished} onChange={sidebarDragChange}>
            <PuzzlePageSidebar
              activePuzzle={activePuzzle}
              allPuzzles={this.data.allPuzzles}
              allTags={this.data.allTags}
              chatReady={this.data.chatReady}
              chatMessages={this.data.chatMessages}
              displayNames={this.data.displayNames}
              canUpdate={this.data.canUpdate}
              interfaceOptions={this.state.interfaceOptions}
              updateInterfaceOptions={this.updateInterfaceOptions}
              isDesktop={this.state.isDesktop}
            />
            <PuzzlePageContent
              puzzle={activePuzzle}
              allTags={this.data.allTags}
              guesses={this.data.allGuesses}
              displayNames={this.data.displayNames}
              documents={this.data.allDocuments}
              interfaceOptions={this.state.interfaceOptions}
              updateInterfaceOptions={this.updateInterfaceOptions}
              isDesktop={this.state.isDesktop}
            />
          </SplitPane>
        ) : (
          <div className="puzzle-page narrow">
            <PuzzlePageMetadata
              puzzle={activePuzzle}
              allTags={this.data.allTags}
              guesses={this.data.allGuesses}
              displayNames={this.data.displayNames}
              documents={this.data.allDocuments}
              interfaceOptions={this.state.interfaceOptions}
              updateInterfaceOptions={this.updateInterfaceOptions}
              isDesktop={this.state.isDesktop}
            />
            <PuzzlePageSidebar
              activePuzzle={activePuzzle}
              allPuzzles={this.data.allPuzzles}
              allTags={this.data.allTags}
              chatReady={this.data.chatReady}
              chatMessages={this.data.chatMessages}
              displayNames={this.data.displayNames}
              canUpdate={this.data.canUpdate}
              interfaceOptions={this.state.interfaceOptions}
              updateInterfaceOptions={this.updateInterfaceOptions}
              isDesktop={this.state.isDesktop}
            />
          </div>
        )}
      </DocumentTitle>
    );
  },
});

export { PuzzlePage };
