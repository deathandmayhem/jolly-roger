import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import BS from 'react-bootstrap';
import { Link, browserHistory } from 'react-router';
import { ReactMeteorData } from 'meteor/react-meteor-data';
import JRPropTypes from '../JRPropTypes.js';
import {
  PuzzleList,
  RelatedPuzzleGroup,
  PuzzleModalForm,
} from './PuzzleComponents.jsx';
import Flags from '../../flags.js';

/* eslint-disable max-len */

const PuzzleListView = React.createClass({
  displayName: 'PuzzleListView',
  propTypes: {
    location: PropTypes.object,
    huntId: PropTypes.string.isRequired,
    canAdd: PropTypes.bool.isRequired,
    canUpdate: PropTypes.bool.isRequired,
    puzzles: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Puzzles.asReactPropTypes()
      )
    ).isRequired,
    allTags: PropTypes.arrayOf(
      PropTypes.shape(
        Schemas.Tags.asReactPropTypes()
      )
    ).isRequired,
  },

  getInitialState() {
    return {
      displayMode: 'group', // One of ['group', 'unlock']
      showSolved: true,
    };
  },

  componentDidMount() {
    this.searchBarNode.focus();
  },

  onAdd(state, callback) {
    const { docType, ...puzzle } = state;
    Meteor.call('createPuzzle', puzzle, docType, callback);
  },

  onSearchStringChange(e) {
    this.setSearchString(e.target.value);
  },

  getSearchString() {
    return this.props.location.query.q || '';
  },

  setSearchString(val) {
    const newQuery = val ? { q: val } : { q: undefined };
    browserHistory.replace({
      pathname: this.props.location.pathname,
      query: _.extend(this.props.location.query, newQuery),
    });
  },

  compileMatcher(searchKeys) {
    const tagNames = _.indexBy(this.props.allTags, '_id');
    return function (puzzle) {
      // for key in searchKeys:
      //   if key in title or key in answer:
      //     return true
      //   if key is a substring of a tag:
      //     return true
      // return false
      for (let i = 0; i < searchKeys.length; i++) {
        const key = searchKeys[i].toLowerCase();
        if (puzzle.title.toLowerCase().indexOf(key) !== -1 ||
            (puzzle.answer && (puzzle.answer.toLowerCase().indexOf(key) !== -1))) {
          return true;
        }

        for (let j = 0; j < puzzle.tags.length; j++) {
          const tagName = tagNames[puzzle.tags[j]].name;
          if (tagName.indexOf(key) !== -1) {
            return true;
          }
        }
      }

      return false;
    };
  },

  filteredPuzzles(puzzles) {
    const searchKeys = this.getSearchString().split(' ');
    let interestingPuzzles;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      // No search query, so no need to do fancy search computation
      interestingPuzzles = puzzles;
    } else {
      const searchKeysWithEmptyKeysRemoved = _.filter(searchKeys, (key) => { return key.length > 0; });
      const isInteresting = this.compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingPuzzles = _.filter(puzzles, isInteresting);
    }

    if (this.state.showSolved) {
      return interestingPuzzles;
    } else {
      return _.filter(interestingPuzzles, (puzzle) => { return !puzzle.answer; });
    }
  },

  puzzlesByUnlock() {
    // Sort and group after filtering
    const filteredPuzzles = this.filteredPuzzles(this.props.puzzles);

    // Sort by creation timestamp
    return _.sortBy(filteredPuzzles, (puzzle) => { return puzzle.createdAt; });
  },

  puzzleGroupsByRelevance() {
    // First, filter puzzles by search keys and unsolved (if selected).
    const filteredPuzzles = this.filteredPuzzles(this.props.puzzles);

    // Extract remaining puzzles into groups (including the
    // "administrivia" group).  Collect puzzles that appear in no
    // groups into a final group, "ungrouped".  Each group (except
    // ungrouped) has shape:
    // {
    //   sharedTag: (tag shape),
    //   puzzles: [(puzzle shape)],
    // }

    const groupsMap = {}; // Maps tag id to list of puzzles holding that tag.
    const ungroupedPuzzles = []; // For collecting puzzles that are not included in any group
    const tagsByIndex = _.indexBy(this.props.allTags, '_id');
    for (let i = 0; i < filteredPuzzles.length; i++) {
      const puzzle = filteredPuzzles[i];
      let grouped = false;
      for (let j = 0; j < puzzle.tags.length; j++) {
        const tag = tagsByIndex[puzzle.tags[j]];
        if (tag.name === 'administrivia' ||
            tag.name.lastIndexOf('group:', 0) === 0) {
          grouped = true;
          if (!groupsMap[tag._id]) {
            groupsMap[tag._id] = [];
          }

          groupsMap[tag._id].push(puzzle);
        }
      }

      if (!grouped) {
        ungroupedPuzzles.push(puzzle);
      }
    }

    // Collect groups into a list.
    const groups = _.map(_.keys(groupsMap), (key) => {
      const val = groupsMap[key];
      return {
        sharedTag: tagsByIndex[key],
        puzzles: val,
      };
    });

    // Add the ungrouped puzzles too, if there are any.
    if (ungroupedPuzzles.length > 0) {
      groups.push({
        puzzles: ungroupedPuzzles,
      });
    }

    // Sort groups by interestingness.
    // Within an interestingness class, sort tags by creation date, which should roughly match hunt order.
    groups.sort((a, b) => {
      const ia = this.interestingnessOfGroup(a, tagsByIndex);
      const ib = this.interestingnessOfGroup(b, tagsByIndex);
      if (ia !== ib) return ia - ib;
      return a.sharedTag.createdAt - b.sharedTag.createdAt;
    });

    return groups;
  },

  interestingnessOfGroup(group, indexedTags) {
    // Rough idea: sort, from top to bottom:
    // -3 administrivia always floats to the top
    // -2 Group with unsolved puzzle with matching meta-for:<this group>
    // -1 Group with some other unsolved is:meta puzzle
    //  0 Groups with no metas yet
    //  1 Ungrouped puzzles
    //  2 Groups with a solved puzzle with matching meta-for:<this group>
    const puzzles = group.puzzles;
    const sharedTag = group.sharedTag;

    // ungrouped puzzles go after groups, esp. after groups with a known unsolved meta.
    // Guarantees that if ia === ib, then sharedTag exists.
    if (!sharedTag) return 1;

    if (sharedTag.name === 'administrivia') {
      return -3;
    }

    // Look for a puzzle with meta-for:(this group's shared tag)
    let metaForTag;
    if (sharedTag && sharedTag.name.lastIndexOf('group:', 0) === 0) {
      metaForTag = `meta-for:${sharedTag.name.slice('group:'.length)}`;
    }

    let hasUnsolvedMeta = false;
    for (let i = 0; i < puzzles.length; i++) {
      const puzzle = puzzles[i];
      for (let j = 0; j < puzzle.tags.length; j++) {
        const tag = indexedTags[puzzle.tags[j]];
        if (metaForTag && tag.name === metaForTag) {
          // This puzzle is meta-for: the group.
          if (puzzle.answer) {
            return 2;
          } else {
            return -2;
          }
        } else if ((tag.name === 'is:meta' || tag.name.lastIndexOf('meta-for:', 0) === 0) && !puzzle.answer) {
          hasUnsolvedMeta = true;
        }
      }
    }

    if (hasUnsolvedMeta) return -1;
    return 0;
  },

  clearSearch() {
    this.setSearchString('');
  },

  switchView(newMode) {
    this.setState({
      displayMode: newMode,
    });
  },

  changeShowSolved(event) {
    this.setState({
      showSolved: event.target.checked,
    });
  },

  showAddModal() {
    this.addModalNode.show();
  },

  render() {
    let bodyComponent;
    switch (this.state.displayMode) { // eslint-disable-line default-case
      case 'group': {
        const puzzleGroups = this.puzzleGroupsByRelevance();
        const groupComponents = puzzleGroups.map((g) => {
          if (g.sharedTag) {
            return (
              <RelatedPuzzleGroup
                key={g.sharedTag._id}
                sharedTag={g.sharedTag}
                relatedPuzzles={g.puzzles}
                allTags={this.props.allTags}
                includeCount={false}
                layout="grid"
                canUpdate={this.props.canUpdate}
              />
            );
          } else {
            return (
              <div key="ungrouped" className="puzzle-list-ungrouped">
                <div>Puzzles in no group:</div>
                <div className="puzzles">
                  <PuzzleList
                    puzzles={g.puzzles}
                    allTags={this.props.allTags}
                    layout="grid"
                    canUpdate={this.props.canUpdate}
                  />
                </div>
              </div>
            );
          }
        });
        bodyComponent = (
          <div>
            {groupComponents}
          </div>
        );
        break;
      }
      case 'unlock': {
        const puzzles = this.puzzlesByUnlock();
        bodyComponent = <PuzzleList puzzles={puzzles} allTags={this.props.allTags} layout="grid" canUpdate={this.props.canUpdate} />;
        break;
      }
    }
    const addPuzzleContent = this.props.canAdd && (
      <div>
        <BS.Button bsStyle="primary" onClick={this.showAddModal}>Add a puzzle</BS.Button>
        <PuzzleModalForm
          huntId={this.props.huntId}
          tags={this.props.allTags}
          ref={(node) => { this.addModalNode = node; }}
          onSubmit={this.onAdd}
        />
      </div>
    );
    return (
      <div>
        <div className="puzzle-list-controls">
          <span>View puzzles by:</span>
          <BS.Nav activeKey={this.state.displayMode} bsStyle="pills" onSelect={this.switchView}>
            <BS.NavItem eventKey={'group'}>Group</BS.NavItem>
            <BS.NavItem eventKey={'unlock'}>Unlock order</BS.NavItem>
          </BS.Nav>
          <div className="puzzle-list-show-solved">
            <div>
              <BS.Checkbox checked={this.state.showSolved} onChange={this.changeShowSolved}>
                Show solved
              </BS.Checkbox>
            </div>
          </div>
          {addPuzzleContent}
          <div>
            <ul>
              <li><Link to={`/hunts/${this.props.huntId}/announcements`}>Announcements</Link></li>
              <li><Link to={`/hunts/${this.props.huntId}/guesses`}>Guesses</Link></li>
              <li><Link to={`/hunts/${this.props.huntId}/hunters`}>Hunters</Link></li>
            </ul>
          </div>
        </div>

        <BS.FormGroup>
          <BS.ControlLabel htmlFor="jr-puzzle-search">
            Search
          </BS.ControlLabel>
          <BS.InputGroup>
            <BS.FormControl
              id="jr-puzzle-search"
              type="text"
              inputRef={(node) => { this.searchBarNode = node; }}
              placeholder="search by title, answer, or tag"
              value={this.getSearchString()}
              onChange={this.onSearchStringChange}
            />
            <BS.InputGroup.Button>
              <BS.Button onClick={this.clearSearch}>
                Clear
              </BS.Button>
            </BS.InputGroup.Button>
          </BS.InputGroup>
        </BS.FormGroup>

        {bodyComponent}
      </div>
    );
  },
});

const PuzzleListPage = React.createClass({
  propTypes: {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    location: PropTypes.object,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', { hunt: this.props.params.huntId });
    const tagsHandle = this.context.subs.subscribe('mongo.tags', { hunt: this.props.params.huntId });

    if (!Flags.active('disable.subcounters')) {
      // Don't bother including this in ready - it's ok if it trickles in
      this.context.subs.subscribe('subscribers.counts', { hunt: this.props.params.huntId });
    }

    const ready = puzzlesHandle.ready() && tagsHandle.ready();
    if (!ready) {
      return {
        ready,
      };
    } else {
      return {
        ready,
        canAdd: Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.insert'),
        canUpdate: Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.update'),
        allPuzzles: Models.Puzzles.find({ hunt: this.props.params.huntId }).fetch(),
        allTags: Models.Tags.find({ hunt: this.props.params.huntId }).fetch(),
      };
    }
  },

  render() {
    if (!this.data.ready) {
      return <span>loading...</span>;
    } else {
      return (
        <PuzzleListView
          location={this.props.location}
          huntId={this.props.params.huntId}
          canAdd={this.data.canAdd}
          canUpdate={this.data.canUpdate}
          puzzles={this.data.allPuzzles}
          allTags={this.data.allTags}
        />
      );
    }
  },
});

export default PuzzleListPage;
