import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import BS from 'react-bootstrap';
import { Link } from 'react-router';
import DocumentTitle from 'react-document-title';
import marked from 'marked';
import moment from 'moment';
import { huntFixtures } from '/imports/fixtures.js';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { ModalForm } from '/imports/client/components/ModalForm.jsx';
import TextareaAutosize from 'react-textarea-autosize';
import { TagList, RelatedPuzzleGroups } from '/imports/client/components/PuzzleComponents.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';

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
  },
  mixins: [PureRenderMixin],
  styles: {
    height: '40%',
    overflowY: 'auto',
    boxSizing: 'border-box',
    borderBottom: '1px solid #111111',
  },
  render() {
    return (
      <div className="related-puzzles-section" style={this.styles}>
        <div>Related puzzles:</div>
        <RelatedPuzzleGroups activePuzzle={this.props.activePuzzle} allPuzzles={this.props.allPuzzles} allTags={this.props.allTags} />
      </div>
    );
  },
});

const ChatMessage = React.createClass({
  propTypes: {
    message: React.PropTypes.shape(Schemas.ChatMessages.asReactPropTypes()).isRequired,
    sender: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()).isRequired,
  },

  mixins: [PureRenderMixin],

  styles: {
    message: {
      // TODO: pick background color based on hashing userid or something?
      backgroundColor: '#f8f8f8',
      marginBottom: '1px',
      wordWrap: 'break-word',
    },
    time: {
      float: 'right',
      fontStyle: 'italic',
      marginRight: '2px',
    },
  },

  render() {
    const ts = moment(this.props.message.timestamp).calendar(null, {
      sameDay: 'LT',
      lastDay: 'LT',
      nextDay: 'LT',
    });

    return (
      <div style={this.styles.message}>
        <span style={this.styles.time}>{ts}</span>
        <strong>{this.props.sender.displayName}</strong>
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
    profiles: React.PropTypes.objectOf(
      React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()).isRequired
    ).isRequired,
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

  styles: {
    messagePane: {
      flex: 'auto',
      overflowY: 'auto',
    },
  },

  render() {
    const profiles = this.props.profiles;
    return (
      <div ref={(node) => { this.node = node; }} style={this.styles.messagePane} onScroll={this.onScroll}>
        {this.props.chatMessages.length === 0 && <span key="no-message">No chatter yet. Say something?</span>}
        {this.props.chatMessages.map((msg) => <ChatMessage key={msg._id} message={msg} sender={profiles[msg.sender]} />)}
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
    profiles: React.PropTypes.objectOf(
      React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()).isRequired
    ).isRequired,
    puzzleId: React.PropTypes.string.isRequired,
  },

  mixins: [PureRenderMixin],

  onInputHeightChange() {
    this.historyNode.maybeForceScrollBottom();
  },

  onMessageSent() {
    this.historyNode.forceScrollBottom();
  },

  styles: {
    flex: '1 1 50%',
    minHeight: '30vh',
    display: 'flex',
    flexDirection: 'column',
  },

  render() {
    return (
      <div className="chat-section" style={this.styles}>
        {this.props.chatReady ? null : <span>loading...</span>}
        <ChatHistory ref={(node) => { this.historyNode = node; }} chatMessages={this.props.chatMessages} profiles={this.props.profiles} />
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
    profiles: React.PropTypes.objectOf(
      React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()).isRequired
    ).isRequired,
  },
  mixins: [PureRenderMixin],
  styles: {
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
        />
        <ChatSection
          chatReady={this.props.chatReady}
          chatMessages={this.props.chatMessages}
          profiles={this.props.profiles}
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
    profiles: React.PropTypes.objectOf(
      React.PropTypes.shape(
        Schemas.Profiles.asReactPropTypes()
      ).isRequired
    ).isRequired,
  },

  mixins: [PureRenderMixin],

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

  showGuessModal() {
    this.formNode.show();
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

  styles: {
    metadata: {
      flex: 'none',
      maxHeight: '80px',
      minHeight: '64px',
      overflow: 'auto',
    },
    row: {
      display: 'block',
      height: '26px',
      lineHeight: '18px',
      verticalAlign: 'middle',
    },
    answer: {
      display: 'inline-block',
      padding: '2px',
      borderRadius: '2px',
      background: '#00FF00',
      color: '#000000',
    },
    left: {
      padding: '4px',
    },
    right: {
      margin: '4px',
      float: 'right',
      clear: 'none',
    },
    button: {
      boxSizing: 'border-box',
      height: '24px',
      paddingTop: '2px',
      paddingBottom: '2px',
      paddingLeft: '8px',
      paddingRight: '8px',
    },
  },

  render() {
    const _this = this;
    const tagsById = _.indexBy(this.props.allTags, '_id');
    const tags = this.props.puzzle.tags.map((tagId) => { return tagsById[tagId]; });
    const answerComponent = this.props.puzzle.answer ? <span style={this.styles.answer}>{`Solved: ${this.props.puzzle.answer}`}</span> : null;
    return (
      <div className="puzzle-metadata" style={this.styles.metadata}>
        <div style={this.styles.row}>
          {this.props.puzzle.url && <div style={this.styles.right}><a target="_blank" rel="noopener noreferrer" href={this.props.puzzle.url}>Puzzle link</a></div>}
          <div style={this.styles.left}><Link to={`/hunts/${this.props.puzzle.hunt}/puzzles`}>Puzzles</Link> / <strong>{this.props.puzzle.title}</strong> {answerComponent}</div>
        </div>
        <div style={this.styles.row}>
          <div style={this.styles.right}><BS.Button style={this.styles.button} onClick={this.showGuessModal}>Submit answer</BS.Button></div>
          <div style={this.styles.left}>
            <span style={{ display: 'inline-block', height: '24px' }}>Tags:</span>
            <TagList
              puzzleId={this.props.puzzle._id}
              tags={tags}
              onCreateTag={this.onCreateTag}
              onRemoveTag={this.onRemoveTag}
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
                      <td>{_this.props.profiles[guess.createdBy].displayName}</td>
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
      return <div style={{ backgroundColor: '#ddddff', flex: 'auto' }}>Attempting to load collaborative document...</div>;
    }

    switch (this.props.document.type) {
      case 'google-spreadsheet': {
        const url = `https://docs.google.com/spreadsheets/d/${this.props.document.value.id}/edit?ui=2&rm=embedded#gid=0`;
        return <iframe style={{ flex: 'auto' }} src={url} />;
      }
      default:
        return (
          <div className="shared-workspace" style={{ backgroundColor: '#ddddff', flex: 'auto' }}>
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
    profiles: React.PropTypes.objectOf(
      React.PropTypes.shape(
        Schemas.Profiles.asReactPropTypes()
      ).isRequired
    ).isRequired,
    documents: React.PropTypes.arrayOf(
      React.PropTypes.shape(
        Schemas.Documents.asReactPropTypes()
      ).isRequired,
    ).isRequired,
  },
  mixins: [PureRenderMixin],
  styles: {
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
          profiles={this.props.profiles}
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
  getMeteorData() {
    // There are some model dependencies that we have to be careful about:
    //
    // * We show the displayname of the person who submitted a guess, so guesses depends on profiles
    // * Chat messages show the displayname of the sender, so chatmessages depends on profiles
    // * Puzzle metadata needs puzzles, tags, guesses, documents, and profiles.
    //
    // We can render some things on incomplete data, but most of them really need full data:
    // * Chat can be rendered with just chat messages and profiles
    // * Puzzle metadata needs puzzles, tags, documents, guesses, and profiles
    // * Related puzzles probably only needs puzzles and tags, but right now it just gets the same
    //   data that the puzzle metadata gets, so it blocks maybe-unnecessarily.

    // Keep a count of how many people are viewing a puzzle. Don't use
    // the subs manager - we don't want this cached
    Meteor.subscribe('subCounter.inc', `puzzle:${this.props.params.puzzleId}`, {
      puzzle: this.props.params.puzzleId,
      hunt: this.props.params.huntId,
    });

    const profileHandle = this.context.subs.subscribe('mongo.profiles');
    const profiles = (profileHandle.ready() && _.indexBy(Models.Profiles.find().fetch(), '_id')) || {};

    let puzzlesReady;
    let allPuzzles;
    let allTags;
    let allGuesses;
    let allDocuments;
    if (_.has(huntFixtures, this.props.params.huntId)) {
      puzzlesReady = true;
      allPuzzles = huntFixtures[this.props.params.huntId].puzzles;
      allTags = huntFixtures[this.props.params.huntId].tags;
      allGuesses = [];
      allDocuments = [];
    } else {
      const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', { hunt: this.props.params.huntId });
      const tagsHandle = this.context.subs.subscribe('mongo.tags', { hunt: this.props.params.huntId });
      const guessesHandle = this.context.subs.subscribe('mongo.guesses', { puzzle: this.props.params.puzzleId });
      const documentsHandle = this.context.subs.subscribe('mongo.documents', { puzzle: this.props.params.puzzleId });
      const viewCountsHandle = this.context.subs.subscribe('subCounter.fetch', { hunt: this.props.params.huntId });

      puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready() && profileHandle.ready() && viewCountsHandle.ready();

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
    }

    const chatHandle = this.context.subs.subscribe('mongo.chatmessages', { puzzleId: this.props.params.puzzleId });

    // Chat is not ready until chat messages and profiles have loaded, but doesn't care about any
    // other collections.
    const chatReady = chatHandle.ready() && profileHandle.ready();
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
      profiles,
      allGuesses,
      allDocuments,
    };
  },

  render() {
    if (!this.data.puzzlesReady) {
      return <span>loading...</span>;
    }

    if (this.data.allDocuments.length === 0) {
      Meteor.call('ensureDocument', this.props.params.puzzleId);
    }

    const activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);
    return (
      <DocumentTitle title={`${activePuzzle.title} :: Jolly Roger`}>
        <div style={{ display: 'flex', flexDirection: 'row', position: 'absolute', top: '0px', bottom: '0px', left: '0px', right: '0px' }}>
          <PuzzlePageSidebar
            activePuzzle={activePuzzle}
            allPuzzles={this.data.allPuzzles}
            allTags={this.data.allTags}
            chatReady={this.data.chatReady}
            chatMessages={this.data.chatMessages}
            profiles={this.data.profiles}
          />
          <PuzzlePageContent
            puzzle={activePuzzle}
            allTags={this.data.allTags}
            guesses={this.data.allGuesses}
            profiles={this.data.profiles}
            documents={this.data.allDocuments}
          />
        </div>
      </DocumentTitle>
    );
  },
});

export { PuzzlePage };
