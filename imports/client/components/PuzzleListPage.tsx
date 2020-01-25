import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { Location } from 'history';
import React from 'react';
import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import InputGroup from 'react-bootstrap/lib/InputGroup';
import ToggleButton from 'react-bootstrap/lib/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/lib/ToggleButtonGroup';
import { Link, browserHistory } from 'react-router';
import Flags from '../../flags';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import PuzzleList from './PuzzleList';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import RelatedPuzzleGroup from './RelatedPuzzleGroup';

/* eslint-disable max-len */

interface PuzzleListViewProps {
  // eslint-disable-next-line no-restricted-globals
  location: Location;
  huntId: string
  canAdd: boolean;
  canUpdate: boolean;
  puzzles: PuzzleType[];
  allTags: TagType[];
}

interface PuzzleGroup {
  sharedTag?: TagType;
  puzzles: PuzzleType[];
}

interface PuzzleListViewState {
  displayMode: 'group' | 'unlock';
  showSolved: boolean;
}

class PuzzleListView extends React.Component<PuzzleListViewProps, PuzzleListViewState> {
  addModalRef: React.RefObject<PuzzleModalForm>

  searchBarRef?: HTMLInputElement

  static displayName = 'PuzzleListView';

  constructor(props: PuzzleListViewProps) {
    super(props);
    this.state = {
      displayMode: 'group',
      showSolved: true,
    };
    this.addModalRef = React.createRef();
  }

  componentDidMount() {
    this.searchBarRef!.focus();
  }

  onAdd = (state: PuzzleModalFormSubmitPayload, callback: (error?: Error) => void) => {
    const { docType, ...puzzle } = state;
    Meteor.call('createPuzzle', puzzle, docType, callback);
  };

  onSearchStringChange = (e: React.FormEvent<FormControl>) => {
    this.setSearchString((e as unknown as React.FormEvent<HTMLInputElement>).currentTarget.value);
  };

  getSearchString = (): string => {
    return this.props.location.query.q || '';
  };

  setSearchString = (val: string) => {
    const newQuery = val ? { q: val } : { q: undefined };
    browserHistory.replace({
      pathname: this.props.location.pathname,
      query: _.extend(this.props.location.query, newQuery),
    });
  };

  compileMatcher = (searchKeys: string[]): (p: PuzzleType) => boolean => {
    const tagNames: Record<string, string> = {};
    this.props.allTags.forEach((t) => {
      tagNames[t._id] = t.name.toLowerCase();
    });
    return function (puzzle) {
      // for key in searchKeys:
      //   if key in title or key in any of the answers:
      //     return true
      //   if key is a substring of a tag:
      //     return true
      // return false
      for (let i = 0; i < searchKeys.length; i++) {
        const key = searchKeys[i].toLowerCase();
        if (puzzle.title.toLowerCase().indexOf(key) !== -1 ||
            (puzzle.answers.map((answer) => { return answer.toLowerCase().indexOf(key) !== -1; }).some(Boolean))) {
          return true;
        }

        for (let j = 0; j < puzzle.tags.length; j++) {
          const tagName = tagNames[puzzle.tags[j]];
          if (tagName && tagName.indexOf(key) !== -1) {
            return true;
          }
        }
      }

      return false;
    };
  };

  filteredPuzzles = (puzzles: PuzzleType[]) => {
    const searchKeys = this.getSearchString().split(' ');
    let interestingPuzzles;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      // No search query, so no need to do fancy search computation
      interestingPuzzles = puzzles;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = this.compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingPuzzles = puzzles.filter(isInteresting);
    }

    if (this.state.showSolved) {
      return interestingPuzzles;
    } else {
      return interestingPuzzles.filter((puzzle) => {
        return (puzzle.answers.length < puzzle.expectedAnswerCount);
      });
    }
  };

  puzzlesByUnlock = () => {
    // Sort and group after filtering
    const filteredPuzzles = this.filteredPuzzles(this.props.puzzles);

    // Sort by creation timestamp
    return _.sortBy(filteredPuzzles, (puzzle) => { return puzzle.createdAt; });
  };

  puzzleGroupsByRelevance = (): PuzzleGroup[] => {
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

    const groupsMap: Record<string, PuzzleType[]> = {}; // Maps tag id to list of puzzles holding that tag.
    const ungroupedPuzzles = []; // For collecting puzzles that are not included in any group
    const tagsByIndex = _.indexBy(this.props.allTags, '_id');
    for (let i = 0; i < filteredPuzzles.length; i++) {
      const puzzle = filteredPuzzles[i];
      let grouped = false;
      for (let j = 0; j < puzzle.tags.length; j++) {
        const tag = tagsByIndex[puzzle.tags[j]];
        // On new puzzle creation, if a tag s new as well, we can receive the new Puzzle object (and
        // rerender) before the new Tag object streams in, so it's possible that we don't have a tag
        // object for a given ID, and that tag here will be undefined.
        if (tag && tag.name && (tag.name === 'administrivia' ||
            tag.name.lastIndexOf('group:', 0) === 0)) {
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
    const groups: PuzzleGroup[] = Object.keys(groupsMap).map((key) => {
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
      return a.sharedTag!.createdAt.getTime() - b.sharedTag!.createdAt.getTime();
    });

    return groups;
  };

  interestingnessOfGroup = (group: PuzzleGroup, indexedTags: Record<string, TagType>) => {
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

        if (tag) {
          // tag may be undefined if we get tag IDs before the new Tag arrives from the server;
          // ignore such tags for sorting purposes

          if (metaForTag && tag.name === metaForTag) {
            // This puzzle is meta-for: the group.
            if (puzzle.answers.length === puzzle.expectedAnswerCount) {
              return 2;
            } else {
              return -2;
            }
          } else if ((tag.name === 'is:meta' || tag.name.lastIndexOf('meta-for:', 0) === 0) && !(puzzle.answers.length === puzzle.expectedAnswerCount)) {
            hasUnsolvedMeta = true;
          }
        }
      }
    }

    if (hasUnsolvedMeta) return -1;
    return 0;
  };

  clearSearch = () => {
    this.setSearchString('');
  };

  switchView = (newMode: 'group' | 'unlock') => {
    this.setState({
      displayMode: newMode,
    });
  };

  changeShowSolved = () => {
    this.setState((oldState) => ({
      showSolved: !oldState.showSolved,
    }));
  };

  showAddModal = () => {
    if (this.addModalRef.current) {
      this.addModalRef.current.show();
    }
  };

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
      <div className="add-puzzle-content">
        <Button bsStyle="primary" onClick={this.showAddModal}>Add a puzzle</Button>
        <PuzzleModalForm
          huntId={this.props.huntId}
          tags={this.props.allTags}
          ref={this.addModalRef}
          onSubmit={this.onAdd}
        />
      </div>
    );
    return (
      <div>
        <div className="puzzle-list-controls">
          <ul className="puzzle-list-links">
            <li><Link to={`/hunts/${this.props.huntId}/announcements`}>Announcements</Link></li>
            <li><Link to={`/hunts/${this.props.huntId}/guesses`}>Guess queue</Link></li>
            <li><Link to={`/hunts/${this.props.huntId}/hunters`}>Hunters</Link></li>
          </ul>
          <div className="puzzle-view-controller">
            <ControlLabel htmlFor="jr-puzzle-search">View puzzles by:</ControlLabel>
            <div className="puzzle-view-controls">
              <ButtonToolbar>
                <ToggleButtonGroup type="radio" name="puzzle-view" defaultValue="group" value={this.state.displayMode} onChange={this.switchView}>
                  <ToggleButton value="group">Group</ToggleButton>
                  <ToggleButton value="unlock">Unlock</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup
                  type="checkbox"
                  value={this.state.showSolved ? ['true'] : []}
                  onChange={this.changeShowSolved}
                >
                  <ToggleButton value="true">Show solved</ToggleButton>
                </ToggleButtonGroup>
              </ButtonToolbar>
              <FormGroup>
                <InputGroup>
                  <FormControl
                    id="jr-puzzle-search"
                    type="text"
                    inputRef={(ref) => { this.searchBarRef = ref; }}
                    placeholder="Filter by title, answer, or tag"
                    value={this.getSearchString()}
                    onChange={this.onSearchStringChange}
                  />
                  <InputGroup.Button>
                    <Button onClick={this.clearSearch}>
                      Clear
                    </Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
              {addPuzzleContent}
            </div>
          </div>
        </div>
        {bodyComponent}
      </div>
    );
  }
}

interface PuzzleListPageParams {
  params: {huntId: string};
  // eslint-disable-next-line no-restricted-globals
  location: Location;
}

type PuzzleListPageProps = PuzzleListPageParams & ({
  ready: true;
  canAdd: boolean;
  canUpdate: boolean;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
} | {
  ready: false;
});

class PuzzleListPage extends React.Component<PuzzleListPageProps> {
  render() {
    if (!this.props.ready) {
      return <span>loading...</span>;
    } else {
      return (
        <PuzzleListView
          location={this.props.location}
          huntId={this.props.params.huntId}
          canAdd={this.props.canAdd}
          canUpdate={this.props.canUpdate}
          puzzles={this.props.allPuzzles}
          allTags={this.props.allTags}
        />
      );
    }
  }
}

const PuzzleListPageContainer = withTracker(({ params }: PuzzleListPageParams) => {
  const puzzlesHandle = Meteor.subscribe('mongo.puzzles', { hunt: params.huntId });
  const tagsHandle = Meteor.subscribe('mongo.tags', { hunt: params.huntId });

  if (!Flags.active('disable.subcounters')) {
    // Don't bother including this in ready - it's ok if it trickles in
    Meteor.subscribe('subscribers.counts', { hunt: params.huntId });
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
      allPuzzles: Puzzles.find({ hunt: params.huntId }).fetch(),
      allTags: Tags.find({ hunt: params.huntId }).fetch(),
    };
  }
})(PuzzleListPage);

export default PuzzleListPageContainer;
