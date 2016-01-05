PureRenderMixin = React.addons.PureRenderMixin;

RelatedPuzzleSection = React.createClass({
  mixins: [PureRenderMixin],
  styles: {
    flex: '0 1 30%',
    maxHeight: '50vh',
    overflowY:'auto',
    boxSizing: 'border-box',
    borderBottom: '1px solid #111111',
  },
  render() {
    return (
      <div className="related-puzzles-section" style={this.styles}>
        <div>Related puzzles:</div>
        <RelatedPuzzleGroups activePuzzle={this.props.activePuzzle} allPuzzles={this.props.allPuzzles} />
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
    },
    time: {
      float:'right',
      fontStyle: 'italic',
      marginRight: '2',
    },
  },
  render() {
    let profiles = this.props.profiles;
    return (
      <div style={this.styles.messagePane}>
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
      Meteor.call('sendChatMessage', this.props.puzzleId, this.state.text);
      this.setState({
        text: '',
      });
    }
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
    flex: '1 1 30%',
    minHeight: '30vh',
    display: 'flex',
    flexDirection: 'column',
  },
  render() {
    // TODO: fetch/track/display chat history
    return (
      <div className="chat-section" style={this.styles}>
        {this.props.chatReady ? null : <span>loading...</span>}
        <ChatHistory chatMessages={this.props.chatMessages} profiles={this.props.profiles} />
        <ChatInput puzzleId={this.props.puzzleId} />
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
    boxSizing: 'border-box',
    borderRight: '1px solid black',
    display: 'flex',
    flexDirection: 'column',
  },
  render() {
    return (
      <div className="sidebar" style={this.styles}>
        <RelatedPuzzleSection activePuzzle={this.props.activePuzzle} allPuzzles={this.props.allPuzzles} />
        <ChatSection chatReady={this.props.chatReady} chatMessages={this.props.chatMessages} profiles={this.props.profiles} puzzleId={this.props.activePuzzle._id} />
      </div>
    );
  },
});

PuzzlePageMetadata = React.createClass({
  mixins: [PureRenderMixin],
  styles: {
    flex: 'none',
    maxHeight: '20vh',
    overflow: 'auto',
  },
  render() {
    return (
      <div className="puzzle-metadata" style={this.styles}>
        <div>Puzzle answer, if known</div>
        <div>Tags for this puzzle + ability to add more</div>
        <div>Other hunters currently viewing this page?</div>
      </div>
    );
  },
});

PuzzlePageMultiplayerDocument = React.createClass({
  mixins: [PureRenderMixin],
  componentDidMount() {
    // TODO: handsontable integration?  gdocs integration?  something.
  },

  render() {
    return (
      <div className="shared-workspace" style={{backgroundColor: '#ddddff', flex: 'auto'}}>This is the part where you would get a spreadsheet or something like that.</div>
    );
  },
});

PuzzlePageContent = React.createClass({
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
        <PuzzlePageMetadata />
        <PuzzlePageMultiplayerDocument />
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
    let allPuzzles = undefined;
    let ready = undefined;
    if (_.has(huntFixtures, this.props.params.huntId)) {
      ready = true;
      allPuzzles = huntFixtures[this.props.params.huntId].puzzles;
    } else {
      let puzzlesHandle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
      ready = puzzlesHandle.ready();
      allPuzzles = Models.Puzzles.find({hunt: this.props.params.huntId}).fetch();
    }

    let chatHandle = Meteor.subscribe('mongo.chatmessages', {puzzleId: this.props.params.puzzleId});

    // Profiles are needed to join display name with sender userid.
    let profileHandle = Meteor.subscribe('mongo.profiles');
    let chatReady = chatHandle.ready() && profileHandle.ready();
    let chatMessages = chatReady && Models.ChatMessages.find(
        {puzzleId: this.props.params.puzzleId},
        {$sort: { timestamp: 1 }}
        ).fetch() || [];
    let profiles = chatReady && _.indexBy(Models.Profiles.find().fetch(), '_id') || {};
    return {
      ready: ready,
      allPuzzles: allPuzzles,
      chatReady: chatReady,
      chatMessages: chatMessages,
      profiles: profiles,
    };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

    let activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);
    return (
      <div style={{display: 'flex', flexDirection: 'row', position: 'absolute', top: '0', bottom: '0', left:'0', right:'0'}}>
        <PuzzlePageSidebar activePuzzle={activePuzzle} allPuzzles={this.data.allPuzzles} chatReady={this.data.chatReady} chatMessages={this.data.chatMessages} profiles={this.data.profiles} />
        <PuzzlePageContent />
      </div>
    );
  },
});
