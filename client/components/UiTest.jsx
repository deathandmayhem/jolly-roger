var PureRenderMixin = React.addons.PureRenderMixin;

var puzzleShape = {
  id: React.PropTypes.string.isRequired,
  title: React.PropTypes.string.isRequired,
  url: React.PropTypes.string, // URL optional for now?  I'm not sure what to do with it.
  answer: React.PropTypes.string,
  tags: React.PropTypes.arrayOf(React.PropTypes.string.isRequired).isRequired,
};

var sortedTags = function sortedTags(tags) {
  // TODO: attempt to sort the tags into a reasonable order before showing them.
  // The sort order for tags should probably be:
  // * the "meta" tag, if present, is always first
  // * "meta:*" comes next (sorted alphabetically, if multiple are present)
  // * all other tags, sorted alphabetically
  return tags;
};

SearchBar = Radium(React.createClass({
  displayName: "SearchBar",
  propTypes: {
    value: React.PropTypes.string.isRequired,
    onSearchStringChange: React.PropTypes.func.isRequired,
  },
  styles: {
    row: {
      display: "block",
      width: "100%",
    },
  },
  handleSearchStringChange(event) {
    this.props.onSearchStringChange(event.target.value);
  },
  render() {
    return (
      <div className="search-row" style={this.styles.row}>
        <input ref="input" placeholder="search by title, answer, or tag"
               style={this.styles.row} value={this.props.value}
               onChange={this.handleSearchStringChange} />
      </div>
    );
  },
}));

FilteringPuzzleSet = React.createClass({
  displayName: "FilteringPuzzleSet",
  propTypes: {
    puzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
  },
  getInitialState() {
    return {
      searchString: "",
    };
  },
  onSearchStringChange(newString) {
    this.setState({searchString: newString});
  },
  compileMatcher(searchKeys) {
    console.log(searchKeys);
    return function(puzzle) {
      // for key in searchKeys:
      //   if key in title or key in answer:
      //     return true
      //   if key is a substring of a tag:
      //     return true
      // return false
      for (var i = 0 ; i < searchKeys.length ; i++) {
        var key = searchKeys[i].toLowerCase();
        if (puzzle.title.toLowerCase().indexOf(key) !== -1 ||
            (puzzle.answer && (puzzle.answer.toLowerCase().indexOf(key) !== -1))) {
          return true;
        }
        for (var j = 0; j < puzzle.tags.length; j++) {
          var tag = puzzle.tags[j];
          if (tag.indexOf(key) !== -1) {
            return true;
          }
        }
      }
      return false;
    };
  },
  filteredPuzzles(puzzles) {
    var searchKeys = this.state.searchString.split(" ");
    if (searchKeys.length === 1 && searchKeys[0] === "") return puzzles;
    var isInteresting = this.compileMatcher(searchKeys);
    return _.filter(puzzles, isInteresting);
  },
  sortedFilteredPuzzles(puzzles) {
    // TODO: implement sorting
    return this.filteredPuzzles(puzzles);
  },
  render() {
    var puzzles = this.sortedFilteredPuzzles(this.props.puzzles);
    return (
      <div>
        <SearchBar value={this.state.searchString} onSearchStringChange={this.onSearchStringChange} />
        <PuzzleList puzzles={puzzles} />
      </div>
    );
  },
});

PuzzleList = Radium(React.createClass({
  displayName: "PuzzleList",
  mixins: [PureRenderMixin],
  propTypes: {
    puzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
  },
  render() {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    var puzzles = [];
    for (var i = 0 ; i < this.props.puzzles.length; i++) {
      var puz = this.props.puzzles[i];
      puzzles.push(<Puzzle key={puz.id} {...puz} />);
    }
    return (
      <div className="puzzle-list">
        {puzzles}
      </div>
    );
  },
}));

Puzzle = Radium(React.createClass({
  displayName: "Puzzle",
  mixins: [PureRenderMixin],
  propTypes: puzzleShape,
  styles: {
    puzzle: {
      display: "block",
      padding: "2",
      background: "#f0f0f0",
      verticalAlign: "top",
      height: "32",
    },
    title: {
      display: "inline-block",
      padding: "2",
      margin: "2",
      verticalAlign: "top",
    },
  },
  render() {
    // id, title, answer, tags
    return (
      <div className="puzzle" style={[this.styles.puzzle]}>
        {/* TODO: make this actually link to that puzzle's page */}
        <div className="title" style={this.styles.title}><a href={""}>{this.props.title}</a></div>
        {this.props.answer ? <PuzzleAnswer answer={this.props.answer} /> : null}
        <TagList tags={this.props.tags} />
      </div>
    );
  },
}));

PuzzleAnswer = Radium(React.createClass({
  displayName: "PuzzleAnswer",
  mixins: [PureRenderMixin],
  propTypes: {
    answer: React.PropTypes.string.isRequired
  },
  styles: {
    display: "inline-block",
    verticalAlign: "top",
    padding: "2",
    margin: "2",
    textTransform: "uppercase",
    background: "#7fff7f",
  },
  render() {
    return (
      <span className="answer" style={this.styles}>{this.props.answer}</span>
    );
  },
}));

TagList = Radium(React.createClass({
  displayName: "TagList",
  mixins: [PureRenderMixin],
  propTypes: {
    tags: React.PropTypes.arrayOf(React.PropTypes.string.isRequired).isRequired
  },
  getInitialState() {
    return {
      expanded: false,
    };
  },
  styles: {
    base: {
      overflow: "hidden",
      display: "inline-block",
    },
  },
  render() {
    // TODO: figure out smart sort order for these?  or maybe the parent is responsible for that?
    var tags = [];
    for (var i = 0; i < this.props.tags.length ; i++) {
      tags.push(<Tag key={this.props.tags[i]} name={this.props.tags[i]} />);
    }
    return (
      <div className="tag-list" style={this.styles.base}>
        {tags}
      </div>
    );
  },
}));

Tag = Radium(React.createClass({
  displayName: "Tag",
  mixins: [PureRenderMixin],
  propTypes: {
      name: React.PropTypes.string.isRequired,
      onClick: React.PropTypes.func,
  },
  styles: {
    base: {
      display: "inline-block",
      margin: "2px",
      padding: "2px",
      borderRadius: "2px",
      background: "#dddddd",
      color: "#000000",
    },
    meta: {
      background: "#ffd57f",
    },
    metaGroup: {
      background: "#7fffff",
    },
    interactive: {
      cursor: "pointer",
    },
  },
  onClick() {
    this.props.onClick && this.props.onClick();
  },
  render() {
    var isMeta = this.props.name === "meta";
    var isMetaGroup = this.props.name.lastIndexOf("meta:", 0) === 0;
    return (
      <div className="tag" style={[this.styles.base, isMeta && this.styles.meta, isMetaGroup && this.styles.metaGroup, this.props.onClick && this.styles.interactive]} onClick={this.onClick}>{this.props.name}</div>
    );
  },
}));


UiTest = Radium(React.createClass({
  render() {
    return (
      <FilteringPuzzleSet puzzles={hunt_2015_puzzles} />
    );
  },
}));
