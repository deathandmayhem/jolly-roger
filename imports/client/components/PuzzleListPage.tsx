import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import InputGroup from 'react-bootstrap/InputGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import Hunts from '../../lib/models/hunts';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';
import { HuntType } from '../../lib/schemas/hunts';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { TagType } from '../../lib/schemas/tags';
import PuzzleList from './PuzzleList';
import PuzzleModalForm, { PuzzleModalFormSubmitPayload } from './PuzzleModalForm';
import RelatedPuzzleGroup from './RelatedPuzzleGroup';

/* eslint-disable max-len */

interface PuzzleListViewProps extends RouteComponentProps {
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

  searchBarRef: React.RefObject<HTMLInputElement>

  static displayName = 'PuzzleListView';

  constructor(props: PuzzleListViewProps) {
    super(props);
    this.state = {
      displayMode: 'group',
      showSolved: true,
    };
    this.addModalRef = React.createRef();
    this.searchBarRef = React.createRef();
  }

  componentDidMount() {
    this.searchBarRef.current!.focus();
  }

  onAdd = (state: PuzzleModalFormSubmitPayload, callback: (error?: Error) => void) => {
    const { docType, ...puzzle } = state;
    Meteor.call('createPuzzle', puzzle, docType, callback);
  };

  onSearchStringChange: FormControlProps['onChange'] = (e) => {
    this.setSearchString(e.currentTarget.value);
  };

  getSearchString = (): string => {
    const u = new URLSearchParams(this.props.location.search);
    const s = u.get('q');
    return s || '';
  };

  setSearchString = (val: string) => {
    const u = new URLSearchParams(this.props.location.search);
    if (val) {
      u.set('q', val);
    } else {
      u.delete('q');
    }

    this.props.history.replace({
      pathname: this.props.location.pathname,
      search: u.toString(),
    });
  };

  compileMatcher = (searchKeys: string[]): (p: PuzzleType) => boolean => {
    const tagNames: Record<string, string> = {};
    this.props.allTags.forEach((t) => {
      tagNames[t._id] = t.name.toLowerCase();
    });
    const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
    return function (puzzle) {
      const titleWords = puzzle.title.toLowerCase().split(' ');
      return lowerSearchKeys.every((key) => {
        // Every key should match at least one of the following:
        // * prefix of word in title
        // * substring of any answer
        // * substring of any tag
        if (titleWords.some((word) => word.startsWith(key))) {
          return true;
        }

        if (puzzle.answers.some((answer) => { return answer.toLowerCase().indexOf(key) !== -1; })) {
          return true;
        }

        const tagMatch = puzzle.tags.some((tagId) => {
          const tagName = tagNames[tagId];
          return (tagName && tagName.indexOf(key) !== -1);
        });

        if (tagMatch) {
          return true;
        }

        return false;
      });
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
            if (puzzle.answers.length >= puzzle.expectedAnswerCount) {
              return 2;
            } else {
              return -2;
            }
          } else if ((tag.name === 'is:meta' || tag.name.lastIndexOf('meta-for:', 0) === 0) && !(puzzle.answers.length >= puzzle.expectedAnswerCount)) {
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
        <Button variant="primary" onClick={this.showAddModal}>Add a puzzle</Button>
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
        <FormLabel htmlFor="jr-puzzle-search">View puzzles by:</FormLabel>
        <div className="puzzle-view-controls">
          <div>
            <ButtonToolbar>
              <ToggleButtonGroup type="radio" className="mr-2" name="puzzle-view" defaultValue="group" value={this.state.displayMode} onChange={this.switchView}>
                <ToggleButton variant="outline-secondary" value="group">Group</ToggleButton>
                <ToggleButton variant="outline-secondary" value="unlock">Unlock</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                type="checkbox"
                value={this.state.showSolved ? ['true'] : []}
                onChange={this.changeShowSolved}
              >
                <ToggleButton variant="outline-secondary" value="true">Show solved</ToggleButton>
              </ToggleButtonGroup>
            </ButtonToolbar>
          </div>
          <FormGroup>
            <InputGroup>
              <FormControl
                id="jr-puzzle-search"
                as="input"
                type="text"
                ref={this.searchBarRef}
                placeholder="Filter by title, answer, or tag"
                value={this.getSearchString()}
                onChange={this.onSearchStringChange}
              />
              <InputGroup.Append>
                <Button variant="outline-secondary" onClick={this.clearSearch}>
                  Clear
                </Button>
              </InputGroup.Append>
            </InputGroup>
          </FormGroup>
          {addPuzzleContent}
        </div>
        {bodyComponent}
      </div>
    );
  }
}

interface PuzzleListPageParams {
  huntId: string;
}

interface PuzzleListPageWithRouterParams extends RouteComponentProps<PuzzleListPageParams> {
}

interface PuzzleListPageProps extends PuzzleListPageWithRouterParams {
  ready: boolean;
  canAdd: boolean;
  canUpdate: boolean;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
  hunt?: HuntType;
}

class PuzzleListPage extends React.Component<PuzzleListPageProps> {
  render() {
    const leadLinks = this.props.hunt?.homepageUrl && (
      <p className="lead">
        <a href={this.props.hunt.homepageUrl} target="_blank" rel="noopener noreferrer" title="Open the hunt homepage">
          <FontAwesomeIcon icon={faExternalLinkAlt} />
          {' '}
          Hunt homepage
        </a>
      </p>
    );
    const puzzleList = this.props.ready ? (
      <PuzzleListView
        match={this.props.match}
        history={this.props.history}
        location={this.props.location}
        huntId={this.props.match.params.huntId}
        canAdd={this.props.canAdd}
        canUpdate={this.props.canUpdate}
        puzzles={this.props.allPuzzles}
        allTags={this.props.allTags}
      />
    ) : (
      <span>loading...</span>
    );
    return (
      <div>
        {leadLinks}
        <ul className="puzzle-list-links">
          <li><Link to={`/hunts/${this.props.match.params.huntId}/announcements`}>Announcements</Link></li>
          <li><Link to={`/hunts/${this.props.match.params.huntId}/guesses`}>Guess queue</Link></li>
          <li><Link to={`/hunts/${this.props.match.params.huntId}/hunters`}>Hunters</Link></li>
        </ul>
        {puzzleList}
      </div>
    );
  }
}

const PuzzleListPageContainer = withTracker(({ match }: PuzzleListPageWithRouterParams) => {
  const puzzlesHandle = Meteor.subscribe('mongo.puzzles', { hunt: match.params.huntId });
  const tagsHandle = Meteor.subscribe('mongo.tags', { hunt: match.params.huntId });

  // Don't bother including this in ready - it's ok if it trickles in
  Meteor.subscribe('subscribers.counts', { hunt: match.params.huntId });

  const ready = puzzlesHandle.ready() && tagsHandle.ready();
  const hunt = Hunts.findOne({ _id: match.params.huntId });
  return {
    ready,
    canAdd: ready && Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.insert'),
    canUpdate: ready && Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.update'),
    allPuzzles: ready ? Puzzles.find({ hunt: match.params.huntId }).fetch() : [],
    allTags: ready ? Tags.find({ hunt: match.params.huntId }).fetch() : [],
    ...(hunt ? { hunt } : { }),
  };
})(PuzzleListPage);

export default PuzzleListPageContainer;
