const {Link} = ReactRouter;
const BS = ReactBootstrap;
const PureRenderMixin = React.addons.PureRenderMixin;

var puzzleShape = Schemas.Puzzles.asReactPropTypes();
var tagShape = Schemas.Tags.asReactPropTypes();

var sortedTags = function sortedTags(tags) {
  // TODO: attempt to sort the tags into a reasonable order before showing them.
  // The sort order for tags should probably be:
  // * the "meta" tag, if present, is always first
  // * "meta:*" comes next (sorted alphabetically, if multiple are present)
  // * all other tags, sorted alphabetically
  return tags;
};

FilteringPuzzleSet = React.createClass({
  displayName: 'FilteringPuzzleSet',
  propTypes: {
    puzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
  },
  getInitialState() {
    return {
      searchString: '',
    };
  },

  onSearchStringChange() {
    var newString = this.refs.searchBar.getValue();
    this.setState({searchString: newString});
  },

  compileMatcher(searchKeys) {
    let tagNames = _.indexBy(this.props.tags, '_id');
    return function(puzzle) {
      // for key in searchKeys:
      //   if key in title or key in answer:
      //     return true
      //   if key is a substring of a tag:
      //     return true
      // return false
      for (var i = 0; i < searchKeys.length; i++) {
        var key = searchKeys[i].toLowerCase();
        if (puzzle.title.toLowerCase().indexOf(key) !== -1 ||
            (puzzle.answer && (puzzle.answer.toLowerCase().indexOf(key) !== -1))) {
          return true;
        }

        for (var j = 0; j < puzzle.tags.length; j++) {
          var tagName = tagNames[puzzle.tags[j]].name;
          if (tagName.indexOf(key) !== -1) {
            return true;
          }
        }
      }

      return false;
    };
  },

  filteredPuzzles(puzzles) {
    var searchKeys = this.state.searchString.split(' ');
    if (searchKeys.length === 1 && searchKeys[0] === '') return puzzles;
    var isInteresting = this.compileMatcher(_.filter(searchKeys, (key) => { return key.length > 0; }));
    return _.filter(puzzles, isInteresting);
  },

  sortedFilteredPuzzles(puzzles) {
    // TODO: implement sorting
    return this.filteredPuzzles(puzzles);
  },

  clearSearch() {
    this.setState({searchString: ''});
  },

  render() {
    var puzzles = this.sortedFilteredPuzzles(this.props.puzzles);
    var clearButton = <BS.Button onClick={this.clearSearch}>Clear</BS.Button>;
    return (
      <div>
        <BS.Input type="text" label="Search" placeholder="search by title, answer, or tag"
                  value={this.state.searchString}
                  ref="searchBar"
                  buttonAfter={clearButton}
                  onChange={this.onSearchStringChange}
        />
        <PuzzleList puzzles={puzzles} tags={this.props.tags} />
      </div>
    );
  },
});

PuzzleList = React.createClass({
  displayName: 'PuzzleList',
  mixins: [PureRenderMixin],
  propTypes: {
    puzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
  },
  render() {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    var puzzles = [];
    for (var i = 0; i < this.props.puzzles.length; i++) {
      var puz = this.props.puzzles[i];
      puzzles.push(<Puzzle key={puz._id} puzzle={puz} tags={this.props.tags} />);
    }

    return (
      <div className="puzzle-list">
        {puzzles}
      </div>
    );
  },
});

Puzzle = React.createClass({
  displayName: 'Puzzle',
  mixins: [PureRenderMixin],
  propTypes: {
    puzzle: React.PropTypes.shape(puzzleShape).isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
  },
  styles: {
    puzzle: {
      display: 'block',

      //padding: "2",
      marginBottom: '4',
      background: '#f0f0f0',
      verticalAlign: 'top',

    },
    title: {
      display: 'inline-block',
      padding: '2',
      margin: '2',
      verticalAlign: 'top',
    },
  },
  render() {
    // id, title, answer, tags
    var linkTarget = `/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`;
    var tagIndex = _.indexBy(this.props.tags, '_id');
    var tags = this.props.puzzle.tags.map((tagId) => { return tagIndex[tagId]; });
    return (
      <div className="puzzle" style={this.styles.puzzle}>
        <div className="title" style={this.styles.title}><Link to={linkTarget}>{this.props.puzzle.title}</Link></div>
        {this.props.puzzle.answer ? <PuzzleAnswer answer={this.props.puzzle.answer} /> : null}
        <TagList tags={tags} />
      </div>
    );
  },
});

PuzzleAnswer = React.createClass({
  displayName: 'PuzzleAnswer',
  mixins: [PureRenderMixin],
  propTypes: {
    answer: React.PropTypes.string.isRequired,
  },
  styles: {
    wrapper: {
      display: 'inline-block',
      verticalAlign: 'top',
      padding: '2',
      margin: '2',
    },
    answer: {
      textTransform: 'uppercase',
      fontWeight: 'bold',
    },
  },
  render() {
    return (
      <span className="answer" style={this.styles.wrapper}>ans: <span style={this.styles.answer}>{this.props.answer}</span></span>
    );
  },
});

TagList = React.createClass({
  displayName: 'TagList',
  mixins: [PureRenderMixin],
  propTypes: {
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    onCreateTag: React.PropTypes.func, // if provided, will show UI for adding a new tag
    onRemoveTag: React.PropTypes.func, // callback if user wants to remove a tag
  },

  getInitialState() {
    return {
      expanded: false,
      editing: false,
      removing: false,
      newTagName: '',
    };
  },

  styles: {
    base: {
      display: 'inline',
    },
    linkButton: {
      // Override some Bootstrap sizes/paddings to make this button fit in the row better.
      height: '24',
      padding: '2',
      display: 'inline-block',
    },
  },

  onTagNameTextChanged(event) {
    this.setState({
      newTagName: event.target.value,
    });
  },

  submitTag(newTagName) {
    // TODO: submitTag should use the value passed in from the child, which may have done some
    // autocomplete matching that this component doesn't know about.
    this.props.onCreateTag && this.props.onCreateTag(newTagName);
    this.setState({
      editing: false,
    });
  },

  startEditing() {
    this.setState({
      editing: true,
      newTagName: '',
    });
  },

  stopEditing() {
    this.setState({ editing: false });
  },

  startRemoving() {
    this.setState({ removing: true });
  },

  stopRemoving() {
    this.setState({ removing: false });
  },

  removeTag(tagIdToRemove) {
    this.props.onRemoveTag && this.props.onRemoveTag(tagIdToRemove);
  },

  render() {
    // TODO: figure out smart sort order for these?  or maybe the parent is responsible for that?
    var tags = [];
    for (var i = 0; i < this.props.tags.length; i++) {
      tags.push(<Tag key={this.props.tags[i]._id}
                     tag={this.props.tags[i]}
                     onRemove={this.state.removing ? this.removeTag : undefined} />);
    }

    if (this.state.editing) {
      tags.push(<TagEditor key="tagEditor" newTagName={this.state.newTagName}
                           onChange={this.onTagNameTextChanged}
                           onSubmit={this.submitTag}
                           onCancel={this.stopEditing}/>);
    } else if (this.state.removing) {
      tags.push(<BS.Button key="stopRemoving"
                           style={this.styles.linkButton}
                           bsStyle="link"
                           onClick={this.stopRemoving}>Done removing</BS.Button>);
    } else {
      if (this.props.onCreateTag) {
        tags.push(<BS.Button key="startEditing"
                             style={this.styles.linkButton}
                             bsStyle="link"
                             onClick={this.startEditing}>Add a tag...</BS.Button>);
      }

      if (this.props.onRemoveTag) {
        tags.push(<BS.Button key="startRemoving"
                             style={this.styles.linkButton}
                             bsStyle="link"
                             onClick={this.startRemoving}>Remove a tag...</BS.Button>);
      }
    }

    return (
      <div className="tag-list" style={this.styles.base}>
        {tags}
      </div>
    );
  },
});

TagEditor = React.createClass({
  // TODO: this should support autocomplete to reduce human error.
  // Probably not going to land this week.
  propTypes: {
    newTagName: React.PropTypes.string.isRequired,
    onChange: React.PropTypes.func.isRequired,
    onSubmit: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,
  },

  onBlur() {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    this.props.onCancel();
  },

  componentDidMount() {
    // Focus the input when mounted - the user just clicked on the button-link.
    let input = ReactDOM.findDOMNode(this.refs.input);
    input.focus();
    input.addEventListener('blur', this.onBlur);
  },

  componentWillUnmount() {
    let input = ReactDOM.findDOMNode(this.refs.input);
    input.removeEventListener('blur', this.onBlur);
  },

  onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.props.onCancel();
    } else if (event.key === 'Enter') {
      // TODO: we may want to submit an autocompletion instead of this.props.newTagName
      event.preventDefault();
      this.props.onSubmit(this.props.newTagName);
    }
    /*
    else if (event.key === 'ArrowUp') {
      // TODO: change autocomplete result
    } else if (event.key === 'ArrowDown') {
      // TODO: change autocomplete result
    }*/
  },

  render() {
    return (
      <span>
        <input ref="input" type="text" style={{minWidth: '100'}}
               value={this.props.newTagName}
               onChange={this.props.onChange}
               onKeyDown={this.onKeyDown}/>
      </span>
    );
  },
});

Tag = React.createClass({
  displayName: 'Tag',
  mixins: [PureRenderMixin],
  propTypes: {
    tag: React.PropTypes.shape(Schemas.Tags.asReactPropTypes()).isRequired,
    onClick: React.PropTypes.func,
    onRemove: React.PropTypes.func, // if present, show a dismiss button
  },
  styles: {
    base: {
      display: 'inline-block',
      margin: '2px',
      padding: '2px',
      borderRadius: '2px',
      background: '#dddddd',
      color: '#000000',
    },
    meta: {
      background: '#ffd57f',
    },
    metaGroup: {
      background: '#7fffff',
    },
    interactive: {
      cursor: 'pointer',
    },
  },

  onClick() {
    this.props.onClick && this.props.onClick();
  },

  onRemove() {
    this.props.onRemove && this.props.onRemove(this.props.tag._id);
  },

  render() {
    var name = this.props.tag.name;
    var isMeta = name === 'is:meta';
    var isMetaGroup = name.lastIndexOf('meta:', 0) === 0;
    var styles = _.extend({},
            this.styles.base,
            isMeta && this.styles.meta,
            isMetaGroup && this.styles.metaGroup,
            this.props.onClick && this.styles.interactive);
    return (
      <div className="tag" style={styles} onClick={this.onClick}>
        {name}
        {this.props.onRemove && <BS.Button bsSize="xsmall" bsStyle="danger" onClick={this.onRemove}>X</BS.Button>}
      </div>
    );
  },
});

RelatedPuzzleGroup = React.createClass({
  displayName: 'RelatedPuzzleGroup',
  propTypes: {
    sharedTag: React.PropTypes.shape(tagShape).isRequired,
    relatedPuzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
  },
  styles: {
    tagWrapper: {
      display: 'block',
    },
    group: {
      marginBottom: '16',
    },
    puzzleListWrapper: {
      paddingLeft: '16',
    },
  },
  render() {
    return (
      <div style={this.styles.group}>
        <div style={this.styles.tagWrapper}>
          <Tag tag={this.props.sharedTag} />
          <span>{'(' + this.props.relatedPuzzles.length + ' ' + (this.props.relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles') + ')'}</span>
        </div>
        <div style={this.styles.puzzleListWrapper}>
          <PuzzleList puzzles={this.props.relatedPuzzles} tags={this.props.allTags} />
        </div>
      </div>
    );
  },
});

var puzzlesWithTag = function(puzzles, tag) {
  return _.filter(puzzles, function(p) { return p.tags.indexOf(tag) !== -1; });
};

RelatedPuzzleGroups = React.createClass({
  displayName: 'RelatedPuzzleGroups',
  propTypes: {
    activePuzzle: React.PropTypes.shape(puzzleShape).isRequired,
    allPuzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
  },
  render() {
    // For each tag, collect all the other puzzles that also have that tag.
    var groups = [];
    var tagIndex = _.indexBy(this.props.allTags, '_id');
    for (var tagi = 0; tagi < this.props.activePuzzle.tags.length; tagi++) {
      var tagId = this.props.activePuzzle.tags[tagi];
      var puzzles = puzzlesWithTag(this.props.allPuzzles, tagId);
      groups.push({tag: tagIndex[tagId], puzzles: puzzles});
    }

    // TODO: sort the tag groups by tag interestingness, which should probably be related to meta
    // presence/absence, tag group size, and number of solved/unsolved?

    // TODO: next, sort the puzzles within each tag group by interestingness.  For instance, metas
    // should probably be at the top of the group, then of the round puzzles, unsolved should
    // maybe sort above solved, and then perhaps by unlock order.

    // We also should probably have some ability to hide the current puzzle from a puzzle group, if
    // we're in a puzzle details page and just looking at related puzzles.  No need to waste
    // precious space on the current puzzle again.

    // Then, render tag group.

    // Hoist allTags into lambda.
    var allTags = this.props.allTags;
    return (
      <div>
        {groups.length ? groups.map(function(g) {
          return <RelatedPuzzleGroup key={g.tag._id} sharedTag={g.tag} relatedPuzzles={g.puzzles} allTags={allTags} />;
        }) : <span>No tags for this puzzle yet.</span>
        }
      </div>
    );
  },
});
