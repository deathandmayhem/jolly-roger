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

/* eslint-disable max-len, no-console */

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
    message: React.PropTypes.shape(Schemas.ChatMessages.asReactPropTypes()).isRequired,
    senderDisplayName: React.PropTypes.string.isRequired,
  },

  mixins: [PureRenderMixin],

  render() {
    const ts = moment(this.props.message.timestamp).calendar(null, {
      sameDay: 'LT',
      lastDay: 'LT',
      nextDay: 'LT',
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
        Schemas.ChatMessages.asReactPropTypes()
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
        Schemas.ChatMessages.asReactPropTypes()
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
        Schemas.ChatMessages.asReactPropTypes()
      ).isRequired
    ).isRequired,
    displayNames: React.PropTypes.objectOf(React.PropTypes.string.isRequired).isRequired,
    canUpdate: React.PropTypes.bool.isRequired,
  },
  mixins: [PureRenderMixin],
  styles: {
    // TODO: figure out what portion of this should be done inline vs in CSS so users
    // can adjust the width of the pane
    flex: '1 1 20%',
    height: '100%',
    maxWidth: '20%',
    boxSizing: 'border-box',
    borderRight: '1px solid black',
    display: 'flex',
    flexDirection: 'column',
  },
  render() {
    return (
      <div className="sidebar" style={this.styles}>
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
  },

  mixins: [ReactMeteorData],

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
    const viewCountComponent = this.props.puzzle.answer ? null : `(${this.data.viewCount} viewing)`;
    const externalLinkComponent = this.props.puzzle.url ? <div className="puzzle-metadata-right"><a target="_blank" rel="noopener noreferrer" href={this.props.puzzle.url}>Puzzle link</a></div> : null;
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
            <iframe className="google-spreadsheet" style={{ width: '100%', height: '100%' }} src={url} />;
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
  },
  mixins: [PureRenderMixin],
  styles: {
    // TODO: figure out what fraction of this can be done in CSS vs JS to support user-resizing
    flex: '4 4 80%',
    verticalAlign: 'top',
    display: 'flex',
    flexDirection: 'column',
  },
  render() {
    return (
      <div className="puzzle-content" style={this.styles}>
        <PuzzlePageMetadata
          puzzle={this.props.puzzle}
          allTags={this.props.allTags}
          guesses={this.props.guesses}
          displayNames={this.props.displayNames}
        />
        <PuzzlePageMultiplayerDocument document={this.props.documents[0]} />
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

  componentWillMount() {
    Meteor.call('ensureDocumentAndPermissions', this.props.params.puzzleId);
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.puzzleId !== this.props.params.puzzleId) {
      Meteor.call('ensureDocumentAndPermissions', nextProps.params.puzzleId);
    }
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

    // Keep a count of how many people are viewing a puzzle. Don't use
    // the subs manager - we don't want this cached
    Meteor.subscribe('subCounter.inc', `puzzle:${this.props.params.puzzleId}`, {
      puzzle: this.props.params.puzzleId,
      hunt: this.props.params.huntId,
    });

    const displayNamesHandle = Models.Profiles.subscribeDisplayNames(this.context.subs);
    let displayNames = {};
    if (displayNamesHandle.ready()) {
      displayNames = Models.Profiles.displayNames();
    }

    const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', { hunt: this.props.params.huntId });
    const tagsHandle = this.context.subs.subscribe('mongo.tags', { hunt: this.props.params.huntId });
    const guessesHandle = this.context.subs.subscribe('mongo.guesses', { puzzle: this.props.params.puzzleId });
    const documentsHandle = this.context.subs.subscribe('mongo.documents', { puzzle: this.props.params.puzzleId });
    const viewCountsHandle = this.context.subs.subscribe('subCounter.fetch', { hunt: this.props.params.huntId });

    const puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready() && displayNamesHandle.ready() && viewCountsHandle.ready();

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

    const chatHandle = this.context.subs.subscribe('mongo.chatmessages', { puzzleId: this.props.params.puzzleId });

    // Chat is not ready until chat messages and display names have loaded, but doesn't care about any
    // other collections.
    const chatReady = chatHandle.ready() && displayNamesHandle.ready();
    const chatMessages = (chatReady && Models.ChatMessages.find(
      { puzzleId: this.props.params.puzzleId },
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

  render() {
    if (!this.data.puzzlesReady) {
      return <span>loading...</span>;
    }

    const activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);
    return (
      <DocumentTitle title={`${activePuzzle.title} :: Jolly Roger`}>
        <div className="puzzle-page">
          <PuzzlePageSidebar
            activePuzzle={activePuzzle}
            allPuzzles={this.data.allPuzzles}
            allTags={this.data.allTags}
            chatReady={this.data.chatReady}
            chatMessages={this.data.chatMessages}
            displayNames={this.data.displayNames}
            canUpdate={this.data.canUpdate}
          />
          <PuzzlePageContent
            puzzle={activePuzzle}
            allTags={this.data.allTags}
            guesses={this.data.allGuesses}
            displayNames={this.data.displayNames}
            documents={this.data.allDocuments}
          />
        </div>
      </DocumentTitle>
    );
  },
});

export { PuzzlePage };
