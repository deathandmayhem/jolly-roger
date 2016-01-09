const BS = ReactBootstrap;

PureRenderMixin = React.addons.PureRenderMixin;

RelatedPuzzleSection = React.createClass({
  mixins: [PureRenderMixin],
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
  styles: {
    height: '40%',
    overflowY:'auto',
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

ChatHistory = React.createClass({
  mixins: [PureRenderMixin],
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
  styles: {
    messagePane: {
      flex: 'auto',
      overflowY: 'auto',
    },
    message: {
      // TODO: pick background color based on hashing userid or something?
      backgroundColor: '#f8f8f8',
      marginBottom: '1',
      wordWrap: 'break-word',
    },
    time: {
      float:'right',
      fontStyle: 'italic',
      marginRight: '2',
    },
  },

  componentWillUpdate() {
    this.saveShouldScroll();
  },

  componentDidUpdate() {
    this.maybeForceScrollBottom();
  },

  onScroll(event) {
    this.saveShouldScroll();
  },

  saveShouldScroll() {
    // Save whether the current scrollTop is equal to the ~maximum scrollTop.
    // If so, then we should make the log "stick" to the bottom, by manually scrolling to the bottom
    // when needed.
    let messagePane = ReactDOM.findDOMNode(this.refs.messagePane);
    this.shouldScroll = (messagePane.clientHeight + messagePane.scrollTop >= messagePane.scrollHeight);
  },

  maybeForceScrollBottom() {
    if (this.shouldScroll) {
      this.forceScrollBottom();
    }
  },

  forceScrollBottom() {
    let messagePane = ReactDOM.findDOMNode(this.refs.messagePane);
    messagePane.scrollTop = messagePane.scrollHeight;
    this.shouldScroll = true;
  },

  componentDidMount() {
    // Scroll to end of chat.
    this.forceScrollBottom();
    let _this = this;

    // Make sure when the window is resized, we stick to the bottom if we were there
    this.resizeHandler = function(event) {
      _this.maybeForceScrollBottom();
    };

    window.addEventListener('resize', this.resizeHandler);
  },

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeHandler);
  },

  render() {
    let profiles = this.props.profiles;
    return (
      <div ref='messagePane' style={this.styles.messagePane} onScroll={this.onScroll}>
        { this.props.chatMessages.length === 0 && <span key="no-message">No chatter yet. Say something?</span> }
        { this.props.chatMessages.map((msg) => {
          // TODO: consider how we want to format dates, if the day was yesterday, or many days ago.
          // This is ugly, but moment.js is huge
          let hours = msg.timestamp.getHours();
          let minutes = msg.timestamp.getMinutes();
          let ts = `${hours < 10 ? '0' + hours : '' + hours}:${minutes < 10 ? '0' + minutes : '' + minutes}`;

          return <div key={msg._id} style={this.styles.message}>
            <span style={this.styles.time}>{ ts }</span>
            <strong>{profiles[msg.sender].displayName}</strong>: {msg.text}
          </div>;
        }) }
      </div>
    );
  },
});

ChatInput = React.createClass({
  mixins: [PureRenderMixin],

  propTypes: {
    onHeightChange: React.PropTypes.func,
  },

  getInitialState() {
    return {
      text: '',
      height: 38,
    };
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
      maxHeight: '200',
    },
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
      }
    }
  },

  onHeightChange(newHeight) {
    this.props.onHeightChange && this.props.onHeightChange(newHeight);
  },

  render() {
    return (
      <TextareaAutosize style={this.styles.textarea}
                        maxLength='4000'
                        minRows={1}
                        maxRows={12}
                        value={this.state.text}
                        onChange={this.onInputChanged}
                        onKeyDown={this.onKeyDown}
                        onHeightChange={this.onHeightChange}
                        placeholder='Chat' />
    );
  },
});

ChatSection = React.createClass({
  mixins: [PureRenderMixin],
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
  styles: {
    flex: '1 1 50%',
    minHeight: '30vh',
    display: 'flex',
    flexDirection: 'column',
  },

  onInputHeightChange(newHeight) {
    this.refs.history.maybeForceScrollBottom();
  },

  render() {
    // TODO: fetch/track/display chat history
    return (
      <div className="chat-section" style={this.styles}>
        {this.props.chatReady ? null : <span>loading...</span>}
        <ChatHistory ref="history" chatMessages={this.props.chatMessages} profiles={this.props.profiles} />
        <ChatInput puzzleId={this.props.puzzleId} onHeightChange={this.onInputHeightChange} />
      </div>
    );
  },
});

PuzzlePageSidebar = React.createClass({
  mixins: [PureRenderMixin],
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
  styles: {
    flex: '1 1 20%',
    height: '100%',
    boxSizing: 'border-box',
    borderRight: '1px solid black',
    display: 'flex',
    flexDirection: 'column',
  },
  render() {
    return (
      <div className="sidebar" style={this.styles}>
        <RelatedPuzzleSection activePuzzle={this.props.activePuzzle} allPuzzles={this.props.allPuzzles} allTags={this.props.allTags} />
        <ChatSection chatReady={this.props.chatReady} chatMessages={this.props.chatMessages} profiles={this.props.profiles} puzzleId={this.props.activePuzzle._id} />
      </div>
    );
  },
});

PuzzlePageMetadata = React.createClass({
  mixins: [PureRenderMixin],
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
    profilesReady: React.PropTypes.bool.isRequired,
    profiles: React.PropTypes.objectOf(
      React.PropTypes.shape(
        Schemas.Profiles.asReactPropTypes()
      ).isRequired
    ).isRequired,
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

  styles: {
    metadata: {
      flex: 'none',
      maxHeight: '80',
      minHeight: '64',
      overflow: 'auto',
    },
    row: {
      display: 'block',
      height: '26',
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
      padding: '4',
    },
    right: {
      margin: '4',
      float: 'right',
      clear: 'none',
    },
    button: {
      boxSizing: 'border-box',
      height: '24',
      paddingTop: '2',
      paddingBottom: '2',
      paddingLeft: '8',
      paddingRight: '8',
    },
  },

  showGuessModal() {
    this.refs.form.show();
  },

  dismissModal() {
    this.refs.form.close();
  },

  onGuessInputChange(event) {
    this.setState({
      guessInput: event.target.value,
    });
  },

  submitGuess() {
    let _this = this;
    Meteor.call('addGuessForPuzzle', this.props.puzzle._id, this.refs.guess.getValue(), (error) => {
      // TODO: dismiss the modal on success?  show error message on failure?
      if (error) {
        _this.setState({
          submitState: 'failed',
          errorMessage: error.message,
        });
        console.log(error);
      }

      // Clear the input box.  Don't dismiss the dialog.
      _this.setState({
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
    return day + ', ' + date.toLocaleTimeString();
  },

  render() {
    const _this = this;
    const tagsById = _.indexBy(this.props.allTags, '_id');
    const tags = this.props.puzzle.tags.map((tagId) => { return tagsById[tagId]; });
    const answerComponent = this.props.puzzle.answer ? <span style={this.styles.answer}>{`Solved: ${this.props.puzzle.answer}`}</span> : null;
    const indexedProfiles = this.props.profilesReady ? _.indexBy(this.props.profiles, '_id') : [];
    return (
      <div className="puzzle-metadata" style={this.styles.metadata}>
        <div style={this.styles.row}>
          {this.props.puzzle.url && <div style={this.styles.right}><a target="_blank" href={this.props.puzzle.url}>Puzzle link</a></div>}
          <div style={this.styles.left}><strong>{this.props.puzzle.title}</strong> {answerComponent}</div>
        </div>
        <div style={this.styles.row}>
          <div style={this.styles.right}><BS.Button style={this.styles.button} onClick={this.showGuessModal}>Submit answer</BS.Button></div>
          <div style={this.styles.left}>
            <span style={{display: 'inline-block', height: '24'}}>Tags:</span>
            <TagList tags={tags} onCreateTag={this.onCreateTag} onRemoveTag={this.onRemoveTag}></TagList>
          </div>
        </div>
        {/* Activity tracking not implemented yet.
            <div>Other hunters currently viewing this page?</div> */}
        <JRC.ModalForm
            ref="form"
            title={'Submit answer to ' + this.props.puzzle.title}
            onSubmit={this.submitGuess}
            submitLabel="Submit">
          {/* TODO: make this show past guesses */}
          <BS.Input
              ref="guess"
              type="text"
              label="Guess"
              labelClassName="col-xs-2"
              wrapperClassName="col-xs-10"
              autoFocus="true"
              onChange={this.onGuessInputChange}
              value={this.state.guessInput}/>
          {this.props.guesses.length === 0 ? <div>No previous submissions.</div> : [
            <div key='label'>Previous submissions:</div>,
            <BS.Table key='table' striped bordered condensed hover>
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
                      <td>{this.formatDate(guess.createdAt)}</td>
                      <td>{this.props.profilesReady ? indexedProfiles[guess.createdBy].displayName : 'loading...'}</td>
                      <td>{guess.state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </BS.Table>,
          ]}
          {this.state.submitState === 'failed' ? <BS.Alert bsStyle="danger" onDismiss={this.clearError}>{this.state.errorMessage}</BS.Alert> : null }
        </JRC.ModalForm>
      </div>
    );
  },
});

PuzzlePageMultiplayerDocument = React.createClass({
  mixins: [PureRenderMixin],
  propTypes: {
    document: React.PropTypes.shape(Schemas.Documents.asReactPropTypes()),
  },

  render() {
    if (!this.props.document) {
      return <div style={{backgroundColor: '#ddddff', flex: 'auto'}}>Attempting to load collaborative document...</div>;
    }

    switch (this.props.document.type) {
      case 'google-spreadsheet':
        const url = `https://docs.google.com/spreadsheets/d/${this.props.document.value.id}/edit`;
        return <iframe style={{flex: 'auto'}} src={url}/>;
      default:
        return (
          <div className="shared-workspace" style={{backgroundColor: '#ddddff', flex: 'auto'}}>
            No way to render a document of type {this.props.document.type}
          </div>
        );
    };
  },
});

PuzzlePageContent = React.createClass({
  mixins: [PureRenderMixin],
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
    profilesReady: React.PropTypes.bool.isRequired,
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
  styles: {
    flex: '4 4 80%',
    verticalAlign: 'top',
    display: 'flex',
    flexDirection: 'column',
  },
  render() {
    return (
      <div className="puzzle-content" style={this.styles}>
        <PuzzlePageMetadata puzzle={this.props.puzzle}
                            allTags={this.props.allTags}
                            guesses={this.props.guesses}
                            profilesReady={this.props.profilesReady}
                            profiles={this.props.profiles} />
        <PuzzlePageMultiplayerDocument document={this.props.documents[0]} />
      </div>
    );
  },
});

var findPuzzleById = function(puzzles, id) {
  for (var i = 0; i < puzzles.length; i++) {
    var puzzle = puzzles[i];
    if (puzzle._id === id) {
      return puzzle;
    }
  }

  return undefined;
};

PuzzlePage = React.createClass({
  mixins: [ReactMeteorData],
  propTypes: {
    // hunt id and puzzle id comes from route?
  },
  statics: {
    // Mark this page as needing fixed, fullscreen layout.
    desiredLayout: 'fullscreen',
  },
  getMeteorData() {
    let puzzlesReady = undefined;
    let allPuzzles = undefined;
    let allTags = undefined;
    let allGuesses = undefined;
    if (_.has(huntFixtures, this.props.params.huntId)) {
      puzzlesReady = true;
      allPuzzles = huntFixtures[this.props.params.huntId].puzzles;
      allTags = huntFixtures[this.props.params.huntId].tags;
      allGuesses = [];
    } else {
      const puzzlesHandle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
      const tagsHandle = Meteor.subscribe('mongo.tags', {hunt: this.props.params.huntId});
      const guessesHandle = Meteor.subscribe('mongo.guesses', {puzzle: this.props.params.puzzleId});
      const documentsHandle = Meteor.subscribe('mongo.documents', {puzzle: this.props.params.puzzleId});
      puzzlesReady = puzzlesHandle.ready() && tagsHandle.ready() && guessesHandle.ready() && documentsHandle.ready();
      allPuzzles = Models.Puzzles.find({hunt: this.props.params.huntId}).fetch();
      allTags = Models.Tags.find({hunt: this.props.params.huntId}).fetch();
      allGuesses = Models.Guesses.find({hunt: this.props.params.huntId, puzzle: this.props.params.puzzleId}).fetch();

      // Sort by created at so that the "first" document always has consistent meaning
      allDocuments = Models.Documents.find({puzzle: this.props.params.puzzleId}, {sort: {createdAt: 1}}).fetch();
    }

    const chatHandle = Meteor.subscribe('mongo.chatmessages', {puzzleId: this.props.params.puzzleId});

    // Profiles are needed to join display name with sender userid.
    const profileHandle = Meteor.subscribe('mongo.profiles');
    const profilesReady = profileHandle.ready();
    const chatReady = chatHandle.ready() && profileHandle.ready();
    const chatMessages = chatReady && Models.ChatMessages.find(
      {puzzleId: this.props.params.puzzleId},
      {sort: { timestamp: 1 }}
    ).fetch() || [];
    const profiles = chatReady && _.indexBy(Models.Profiles.find().fetch(), '_id') || {};
    return {
      puzzlesReady,
      allPuzzles,
      allTags,
      chatReady,
      chatMessages,
      profiles,
      profilesReady,
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

    let activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);
    return (
      <div style={{display: 'flex', flexDirection: 'row', position: 'absolute', top: '0', bottom: '0', left:'0', right:'0'}}>
        <PuzzlePageSidebar activePuzzle={activePuzzle}
                           allPuzzles={this.data.allPuzzles}
                           allTags={this.data.allTags}
                           chatReady={this.data.chatReady}
                           chatMessages={this.data.chatMessages}
                           profiles={this.data.profiles} />
        <PuzzlePageContent puzzle={activePuzzle}
                           allTags={this.data.allTags}
                           guesses={this.data.allGuesses}
                           profilesReady={this.data.profilesReady}
                           profiles={this.data.profiles}
                           documents={this.data.allDocuments}/>
      </div>
    );
  },
});
