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
  render() {
    return (
      <div style={{flex: 'auto'}}>Chat history would go here.</div>
    );
  },
});

ChatInput = React.createClass({
  // TODO: add event handlers for typing, pressing enter, etc.
  mixins: [PureRenderMixin],
  styles: {
    flex: 'none',
  },
  render() {
    return (
      <input style={{flex: 'none'}} placeholder="Chat" />
    );
  },
});

ChatSection = React.createClass({
  mixins: [PureRenderMixin],
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
        <ChatHistory />
        <ChatInput />
      </div>
    );
  },
});

PuzzlePageSidebar = React.createClass({
  mixins: [PureRenderMixin],
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
        <RelatedPuzzleSection {...this.props} />
        <ChatSection/>
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
    // puzzle id comes from route?
    // TODO: whole puzzle list should come from DB, not mock
  },
  getMeteorData() {
    if (_.has(huntFixtures, this.props.params.huntId)) {
      return {
        ready: true,
        allPuzzles: huntFixtures[this.props.params.huntId].puzzles,
      };
    }

    var handle = Meteor.subscribe('mongo.puzzles', {hunt: this.props.params.huntId});
    return {
      ready: handle.ready(),
      allPuzzles: Models.Puzzles.find({hunt: this.props.params.huntId}).fetch(),
    };
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    }

    let activePuzzle = findPuzzleById(this.data.allPuzzles, this.props.params.puzzleId);
    return (
      <div style={{display: 'flex', flexDirection: 'row', position: 'absolute', top: '0', bottom: '0', left:'0', right:'0'}}>
        <PuzzlePageSidebar activePuzzle={activePuzzle} allPuzzles={this.data.allPuzzles} />
        <PuzzlePageContent />
      </div>
    );
  },
});

// Mark this page as requiring fixed, fullscreen layout.
PuzzlePage.fullscreenLayout = true;
