import { _ } from 'meteor/underscore';
import { jQuery } from 'meteor/jquery';
import React from 'react';
import { Link } from 'react-router';
import BS from 'react-bootstrap';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import { ReactSelect2 } from '/imports/client/components/ReactSelect2.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';

/* eslint-disable max-len */

const puzzleShape = Schemas.Puzzles.asReactPropTypes();
const tagShape = Schemas.Tags.asReactPropTypes();

/*
const puzzleHasTag = (puzzle, tag) => {
  return _.contains(puzzle.tags, tag._id);
};
*/

const puzzleInterestingness = (puzzle, indexedTags, group) => {
  // If the shared tag for this group is group:<something>, then group will equal '<something>', and
  // we wish to sort a puzzle named 'meta-for:<something>' at the top.
  let desiredTagName;
  if (group) {
    desiredTagName = `meta-for: ${group}`;
  }

  let minScore = 0;

  for (let i = 0; i < puzzle.tags.length; i++) {
    const tag = indexedTags[puzzle.tags[i]];
    if (desiredTagName && tag.name === desiredTagName) {
      // Matching meta gets sorted top.
      minScore = Math.min(-3, minScore);
    } else if (tag.name === 'is:metameta') {
      // Metameta sorts above meta.
      minScore = Math.min(-2, minScore);
    } else if (tag.name === 'is:meta') {
      // Meta sorts above non-meta.
      minScore = Math.min(-1, minScore);
    }
  }

  return minScore;
};

const sortPuzzlesByRelevanceWithinPuzzleGroup = function (puzzles, sharedTag, indexedTags) {
  // If sharedTag is a meta:<something> tag, sort a puzzle with a meta-for:<something> tag at top.
  let group;
  if (sharedTag.name.lastIndexOf('group:', 0) === 0) {
    group = sharedTag.name.slice('group:'.length);
  }

  const sortedPuzzles = _.toArray(puzzles);
  sortedPuzzles.sort((a, b) => {
    const ia = puzzleInterestingness(a, indexedTags, group);
    const ib = puzzleInterestingness(b, indexedTags, group);
    if (ia !== ib) {
      return ia - ib;
    } else {
      // Sort puzzles by creation time otherwise.
      return a.createdAt - b.createdAt;
    }
  });

  return sortedPuzzles;
};

const PuzzleAnswer = React.createClass({
  displayName: 'PuzzleAnswer',
  propTypes: {
    answer: React.PropTypes.string.isRequired,
  },
  mixins: [PureRenderMixin],
  styles: {
    wrapper: {
      display: 'inline-block',
      verticalAlign: 'top',
      padding: '2px',
      margin: '2px',
    },
    answer: {
      textTransform: 'uppercase',
      fontFamily: 'monospace',
      fontWeight: 'bold',
    },
  },
  render() {
    return (
      <span className="answer" style={this.styles.wrapper}><span style={this.styles.answer}>{this.props.answer}</span></span>
    );
  },
});

const Puzzle = React.createClass({
  displayName: 'Puzzle',
  propTypes: {
    puzzle: React.PropTypes.shape(puzzleShape).isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    layout: React.PropTypes.string.isRequired,
  },
  mixins: [PureRenderMixin],
  styles: {
    // TODO: turn this horrid mess into CSS
    puzzle: {
      marginBottom: '4px',
      background: '#e5e5e5',
      verticalAlign: 'top',
    },
    unsolvedPuzzle: {
      background: '#e5e5e5',
    },
    solvedPuzzle: {
      background: '#bfffbf',
    },
    gridLayout: {
      puzzle: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'flex-start',
      },
      title: {
        flex: '0 0 25%',
        display: 'inline-block',
        padding: '2px',
        margin: '2px',
        verticalAlign: 'top',
        wordBreak: 'break-word',
      },
      puzzleLink: {
        flex: '0 0 10%',
        display: 'inline-block',
        padding: '2px',
        margin: '2px',
        verticalAlign: 'top',
      },
      answer: {
        flex: '0 0 20%',
        display: 'inline-block',
        wordBreak: 'break-word',
      },
      tags: {
        flex: '0 0 45%',
        display: 'inline-block',
      },
    },
    inlineLayout: {
      puzzle: {
        display: 'block',
      },
      title: {
        display: 'inline-block',
        padding: '2px',
        margin: '2px',
        verticalAlign: 'top',
      },
      answer: {
        display: 'inline-block',
        verticalAlign: 'top',
      },
      tags: {
        display: 'inline-block',
        verticalAlign: 'top',
      },
    },
  },
  render() {
    // id, title, answer, tags
    const linkTarget = `/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`;
    const tagIndex = _.indexBy(this.props.tags, '_id');
    const tags = this.props.puzzle.tags.map((tagId) => { return tagIndex[tagId]; });
    const layoutStyles = {
      grid: this.styles.gridLayout,
      inline: this.styles.inlineLayout,
    }[this.props.layout];
    const puzzleStyle = _.extend(
      {},
      this.styles.puzzle,
      layoutStyles.puzzle,
      this.props.puzzle.answer ? this.styles.solvedPuzzle : this.styles.unsolvedPuzzle,
    );
    /*
    const countTooltip = (
      <BS.Tooltip>
        users currently viewing this puzzle
      </BS.Tooltip>
    );
    */

    return (
      <div className="puzzle" style={puzzleStyle}>
        <div className="title" style={layoutStyles.title}>
          <Link to={linkTarget}>{this.props.puzzle.title}</Link>
        </div>
        {this.props.layout === 'grid' ?
          <div className="puzzle-link" style={layoutStyles.puzzleLink}>
            {this.props.puzzle.url ? <span>(<a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">puzzle</a>)</span> : null}
          </div> :
          null}
        <div className="puzzle-answer" style={layoutStyles.answer}>
          {this.props.puzzle.answer ? <PuzzleAnswer answer={this.props.puzzle.answer} /> : null}
        </div>
        <TagList puzzleId={this.props.puzzle._id} tags={tags} />
      </div>
    );
  },
});

const PuzzleList = React.createClass({
  displayName: 'PuzzleList',
  propTypes: {
    puzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    layout: React.PropTypes.string.isRequired,
  },
  mixins: [PureRenderMixin],
  render() {
    // This component just renders the puzzles provided, in order.
    // Adjusting order based on tags, tag groups, etc. is to be done at
    // a higher layer.
    const puzzles = [];
    for (let i = 0; i < this.props.puzzles.length; i++) {
      const puz = this.props.puzzles[i];
      puzzles.push(<Puzzle key={puz._id} puzzle={puz} tags={this.props.tags} layout={this.props.layout} />);
    }

    return (
      <div className="puzzle-list">
        {puzzles}
      </div>
    );
  },
});

const TagEditor = React.createClass({
  // TODO: this should support autocomplete to reduce human error.
  // Probably not going to land this week.
  propTypes: {
    puzzleId: React.PropTypes.string.isRequired,
    onSubmit: React.PropTypes.func.isRequired,
    onCancel: React.PropTypes.func.isRequired,
  },

  mixins: [ReactMeteorData],

  componentDidMount() {
    // Focus the input when mounted - the user just clicked on the button-link.
    const input = this.inputNode;
    jQuery(input).select2('open')
      .on('select2:close', this.onBlur)
      .on('select2:select', () => {
        this.props.onSubmit(jQuery(input).val());
      });
  },

  onBlur() {
    // Treat blur as "no I didn't mean to do that".  We may have to change this
    // once we have autocomplete .
    this.props.onCancel();
  },

  getMeteorData() {
    const puzzle = Models.Puzzles.findOne(this.props.puzzleId);
    return { allTags: Models.Tags.find({ hunt: puzzle.hunt }).fetch() };
  },

  render() {
    return (
      <span>
        <ReactSelect2
          ref={(node) => { this.inputNode = node; }}
          style={{ minWidth: '100px' }}
          data={[''].concat(_.pluck(this.data.allTags, 'name'))}
          options={{ tags: true }}
        />
      </span>
    );
  },
});

const Tag = React.createClass({
  displayName: 'Tag',
  propTypes: {
    tag: React.PropTypes.shape(Schemas.Tags.asReactPropTypes()).isRequired,
    onClick: React.PropTypes.func,
    onRemove: React.PropTypes.func, // if present, show a dismiss button
  },

  mixins: [PureRenderMixin],

  onClick() {
    if (this.props.onClick) {
      this.props.onClick();
    }
  },

  onRemove() {
    if (this.props.onRemove) {
      this.props.onRemove(this.props.tag._id);
    }
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
    metaFor: {
      background: '#ffb0b0',
    },
    group: {
      background: '#7fffff',
    },
    needs: {
      background: '#ff4040',
    },
    interactive: {
      cursor: 'pointer',
    },
  },

  render() {
    const name = this.props.tag.name;
    const isMeta = name === 'is:meta' || name === 'is:metameta';
    const isGroup = name.lastIndexOf('group:', 0) === 0;
    const isMetaFor = name.lastIndexOf('meta-for:', 0) === 0;
    const isNeeds = name.lastIndexOf('needs:', 0) === 0;
    const styles = _.extend(
      {},
      this.styles.base,
      isMeta && this.styles.meta,
      isGroup && this.styles.group,
      isMetaFor && this.styles.metaFor,
      isNeeds && this.styles.needs,
      this.props.onClick && this.styles.interactive,
    );
    return (
      <div className="tag" style={styles} onClick={this.onClick}>
        {name}
        {this.props.onRemove && <BS.Button bsSize="xsmall" bsStyle="danger" onClick={this.onRemove}>X</BS.Button>}
      </div>
    );
  },
});

const TagList = React.createClass({
  displayName: 'TagList',
  propTypes: {
    puzzleId: React.PropTypes.string.isRequired,
    tags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    onCreateTag: React.PropTypes.func, // if provided, will show UI for adding a new tag
    onRemoveTag: React.PropTypes.func, // callback if user wants to remove a tag
  },
  mixins: [PureRenderMixin],

  getInitialState() {
    return {
      expanded: false,
      editing: false,
      removing: false,
    };
  },

  styles: {
    base: {
      display: 'inline',
    },
    linkButton: {
      // Override some Bootstrap sizes/paddings to make this button fit in the row better.
      height: '24px',
      padding: '2px',
      display: 'inline-block',
    },
  },

  submitTag(newTagName) {
    // TODO: submitTag should use the value passed in from the child, which may have done some
    // autocomplete matching that this component doesn't know about.
    if (this.props.onCreateTag) {
      this.props.onCreateTag(newTagName);
    }
    this.setState({
      editing: false,
    });
  },

  startEditing() {
    this.setState({ editing: true });
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
    if (this.props.onRemoveTag) {
      this.props.onRemoveTag(tagIdToRemove);
    }
  },

  soloTagInterestingness(tag) {
    if (tag.name === 'is:metameta') {
      return -5;
    } else if (tag.name === 'is:meta') {
      return -4;
    } else if (tag.name.lastIndexOf('meta-for:', 0) === 0) {
      return -3;
    } else if (tag.name.lastIndexOf('group:', 0) === 0) {
      return -2;
    } else if (tag.name.lastIndexOf('needs:', 0) === 0) {
      return -1;
    } else {
      return 0;
    }
  },

  sortedTagsForSinglePuzzle(tags) {
    // The sort order for tags should probably be:
    // * "is:metameta" first
    // * then "is:meta"
    // * "meta:*" comes next (sorted alphabetically, if multiple are present)
    // * all other tags, sorted alphabetically
    const sortedTags = _.toArray(tags);

    sortedTags.sort((a, b) => {
      const ia = this.soloTagInterestingness(a);
      const ib = this.soloTagInterestingness(b);
      if (ia !== ib) {
        return ia - ib;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return sortedTags;
  },

  render() {
    const tags = this.sortedTagsForSinglePuzzle(this.props.tags);
    const components = [];
    for (let i = 0; i < tags.length; i++) {
      components.push(
        <Tag
          key={tags[i]._id}
          tag={tags[i]}
          onRemove={this.state.removing ? this.removeTag : undefined}
        />
      );
    }

    if (this.state.editing) {
      components.push(
        <TagEditor
          key="tagEditor"
          puzzleId={this.props.puzzleId}
          onSubmit={this.submitTag}
          onCancel={this.stopEditing}
        />
      );
    } else if (this.state.removing) {
      components.push(
        <BS.Button
          key="stopRemoving"
          style={this.styles.linkButton}
          bsStyle="link"
          onClick={this.stopRemoving}
        >
          Done removing
        </BS.Button>
      );
    } else {
      if (this.props.onCreateTag) {
        components.push(
          <BS.Button
            key="startEditing"
            style={this.styles.linkButton}
            bsStyle="link"
            onClick={this.startEditing}
          >
            Add a tag...
          </BS.Button>
        );
      }

      if (this.props.onRemoveTag) {
        components.push(
          <BS.Button
            key="startRemoving"
            style={this.styles.linkButton}
            bsStyle="link"
            onClick={this.startRemoving}
          >
            Remove a tag...
          </BS.Button>
        );
      }
    }

    return (
      <div className="tag-list" style={this.styles.base}>
        {components}
      </div>
    );
  },
});

const RelatedPuzzleGroup = React.createClass({
  displayName: 'RelatedPuzzleGroup',

  propTypes: {
    sharedTag: React.PropTypes.shape(tagShape).isRequired,
    relatedPuzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
    includeCount: React.PropTypes.bool,
    layout: React.PropTypes.string.isRequired,
  },

  getInitialState() {
    return {
      collapsed: false,
    };
  },

  styles: {
    group: {
      marginBottom: '16px',
    },
    tagWrapper: {
      display: 'block',
    },
    puzzleListWrapper: {
      paddingLeft: '16px',
    },
  },

  toggleCollapse() {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  },

  render() {
    // Sort the puzzles within each tag group by interestingness.  For instance, metas
    // should probably be at the top of the group, then of the round puzzles, unsolved should
    // maybe sort above solved, and then perhaps by unlock order.
    const tagIndex = _.indexBy(this.props.allTags, '_id');
    const sortedPuzzles = sortPuzzlesByRelevanceWithinPuzzleGroup(this.props.relatedPuzzles, this.props.sharedTag, tagIndex);

    return (
      <div style={this.styles.group}>
        <div style={this.styles.tagWrapper} onClick={this.toggleCollapse}>
          {this.state.collapsed ?
            <span className="glyphicon glyphicon-chevron-up" /> :
            <span className="glyphicon glyphicon-chevron-down" />}
          <Tag tag={this.props.sharedTag} />
          {this.props.includeCount && <span>{`(${this.props.relatedPuzzles.length} other ${this.props.relatedPuzzles.length === 1 ? 'puzzle' : 'puzzles'})`}</span>}
        </div>
        {this.state.collapsed ? null :
          <div style={this.styles.puzzleListWrapper}>
            <PuzzleList puzzles={sortedPuzzles} tags={this.props.allTags} layout={this.props.layout} />
          </div>}
      </div>
    );
  },
});

const RelatedPuzzleGroups = React.createClass({
  displayName: 'RelatedPuzzleGroups',
  propTypes: {
    activePuzzle: React.PropTypes.shape(puzzleShape).isRequired,
    allPuzzles: React.PropTypes.arrayOf(React.PropTypes.shape(puzzleShape)).isRequired,
    allTags: React.PropTypes.arrayOf(React.PropTypes.shape(tagShape)).isRequired,
  },

  relatedPuzzlesTagInterestingness(tag, metaForTagIfKnown) {
    // Maps a tag into an interestingness class.  Smaller numbers are more interesting.
    // group: tags go at the beginning of the list, because you're
    // most interested in the other puzzles from this meta/round.
    if (tag.name.lastIndexOf('group:', 0) === 0) {
      // If this puzzle has a meta-for:<something> tag, prioritize the
      // meta:<something> tag over all the others.
      if (metaForTagIfKnown) {
        const metaTagName = metaForTagIfKnown.name.slice('meta-for:'.length);
        const thisMetaName = tag.name.slice('group:'.length);
        if (metaTagName === thisMetaName) {
          return -2;
        }
      }

      return -1;
    } else {
      // Otherwise, use sort order
      return 0;
    }
  },

  sortedTagsForRelatedPuzzles(tags) {
    // Clone a copy of the tags.
    const tagList = _.toArray(tags);

    // Look for a tag that starts with 'meta-for:'.
    const metaForTag = _.filter(tags, (tag) => { return tag.name.lastIndexOf('meta-for:', 0) === 0; })[0];

    tagList.sort((a, b) => {
      const ia = this.relatedPuzzlesTagInterestingness(a, metaForTag);
      const ib = this.relatedPuzzlesTagInterestingness(b, metaForTag);
      if (ia !== ib) {
        return ia - ib;
      } else {
        // Just sort lexically within interestingness classes.
        return a.name.localeCompare(b.name);
      }
    });

    return tagList;
  },

  puzzlesWithTagIdExcept(puzzles, tagId, puzzleId) {
    return _.filter(puzzles, (p) => {
      return p._id !== puzzleId && p.tags.indexOf(tagId) !== -1;
    });
  },

  render() {
    // For each tag, collect all the other puzzles that also have that tag.
    const groups = [];
    const tagIndex = _.indexBy(this.props.allTags, '_id');

    // TODO: sort the tag groups by tag interestingness, which should probably be related to meta
    // presence/absence, tag group size, and number of solved/unsolved?
    const activePuzzleTags = this.sortedTagsForRelatedPuzzles(_.map(this.props.activePuzzle.tags, (tagId) => {
      return tagIndex[tagId];
    }));

    for (let tagi = 0; tagi < activePuzzleTags.length; tagi++) {
      const tag = activePuzzleTags[tagi];
      const puzzles = this.puzzlesWithTagIdExcept(this.props.allPuzzles, tag._id, this.props.activePuzzle._id);

      // Only include a tag/puzzleset if there are actually puzzles other than the activePuzzle
      // that hold this tag.
      if (puzzles.length) {
        groups.push({ tag, puzzles });
      }
    }

    // We also should probably have some ability to hide the current puzzle from a puzzle group, if
    // we're in a puzzle details page and just looking at related puzzles.  No need to waste
    // precious space on the current puzzle again.

    // Then, render tag group.

    return (
      <div>
        {groups.length ? groups.map((g) => {
          return (
            <RelatedPuzzleGroup
              key={g.tag._id}
              sharedTag={g.tag}
              relatedPuzzles={g.puzzles}
              allTags={this.props.allTags}
              includeCount
              layout="inline"
            />
          );
        }) : <span>No tags for this puzzle yet.</span>
        }
      </div>
    );
  },
});

export { PuzzleList, TagList, RelatedPuzzleGroup, RelatedPuzzleGroups };
