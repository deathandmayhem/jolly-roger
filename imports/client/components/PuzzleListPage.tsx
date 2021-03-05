import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import {
  faBullhorn,
  faMap,
  faReceipt,
  faUsers,
  faEraser,
} from '@fortawesome/free-solid-svg-icons';
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
import { filteredPuzzleGroups, puzzleGroupsByRelevance } from './puzzle-sort-and-group';

interface PuzzleListViewProps extends RouteComponentProps {
  huntId: string
  canAdd: boolean;
  canUpdate: boolean;
  puzzles: PuzzleType[];
  allTags: TagType[];
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

  filteredPuzzles = (puzzles: PuzzleType[]): PuzzleType[] => {
    const matchingSearch = this.puzzlesMatchingSearchString(puzzles);
    return this.puzzlesMatchingSolvedFilter(matchingSearch);
  };

  puzzlesMatchingSearchString = (puzzles: PuzzleType[]): PuzzleType[] => {
    const searchKeys = this.getSearchString().split(' ');
    if (searchKeys.length === 1 && searchKeys[0] === '') {
      // No search query, so no need to do fancy search computation
      return puzzles;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = this.compileMatcher(searchKeysWithEmptyKeysRemoved);
      return puzzles.filter(isInteresting);
    }
  };

  puzzlesMatchingSolvedFilter = (puzzles: PuzzleType[]): PuzzleType[] => {
    if (this.state.showSolved) {
      return puzzles;
    } else {
      return puzzles.filter((puzzle) => {
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
        // We group and sort first, and only filter afterward, to avoid losing the
        // relative group structure as a result of removing some puzzles from
        // consideration.
        const retainedPuzzles = this.filteredPuzzles(this.props.puzzles);
        const retainedIds = new Set(retainedPuzzles.map((puzzle) => puzzle._id));
        const unfilteredGroups = puzzleGroupsByRelevance(this.props.puzzles, this.props.allTags);
        const puzzleGroups = filteredPuzzleGroups(unfilteredGroups, retainedIds);
        const groupComponents = puzzleGroups.map((g) => {
          const suppressedTagIds = [];
          if (g.sharedTag) {
            suppressedTagIds.push(g.sharedTag._id);
          }
          return (
            <RelatedPuzzleGroup
              key={g.sharedTag ? g.sharedTag._id : 'ungrouped'}
              group={g}
              noSharedTagLabel="(no group specified)"
              allTags={this.props.allTags}
              includeCount={false}
              layout="grid"
              canUpdate={this.props.canUpdate}
              suppressedTagIds={suppressedTagIds}
            />
          );
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
      <>
        <Button variant="primary" onClick={this.showAddModal}>Add a puzzle</Button>
        <PuzzleModalForm
          huntId={this.props.huntId}
          tags={this.props.allTags}
          ref={this.addModalRef}
          onSubmit={this.onAdd}
        />
      </>
    );
    return (
      <div>
        <FormGroup>
          <FormLabel htmlFor="jr-puzzle-search">View puzzles by:</FormLabel>
          <div className="puzzle-view-controls">
            <ButtonToolbar>
              <ToggleButtonGroup type="radio" className="mr-2" name="puzzle-view" defaultValue="group" value={this.state.displayMode} onChange={this.switchView}>
                <ToggleButton variant="outline-info" value="group">Group</ToggleButton>
                <ToggleButton variant="outline-info" value="unlock">Unlock</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                type="checkbox"
                value={this.state.showSolved ? ['true'] : []}
                onChange={this.changeShowSolved}
              >
                <ToggleButton variant="outline-info" value="true">Show solved</ToggleButton>
              </ToggleButtonGroup>
            </ButtonToolbar>
            <ButtonToolbar className="puzzle-list-filter-toolbar">
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
                  <Button variant="secondary" onClick={this.clearSearch}>
                    <FontAwesomeIcon icon={faEraser} />
                  </Button>
                </InputGroup.Append>
              </InputGroup>
            </ButtonToolbar>
            <ButtonToolbar>
              {addPuzzleContent}
            </ButtonToolbar>
          </div>
        </FormGroup>
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
  hunt: HuntType;
}

class PuzzleListPage extends React.Component<PuzzleListPageProps> {
  render() {
    const huntLink = this.props.hunt.homepageUrl && (
      <li className="puzzle-list-link-external">
        <a href={this.props.hunt.homepageUrl} target="_blank" rel="noopener noreferrer" title="Open the hunt homepage">
          <FontAwesomeIcon icon={faMap} />
          <span className="puzzle-list-link-label">Hunt homepage</span>
        </a>
      </li>
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
        <ul className="puzzle-list-links">
          {huntLink}
          <li>
            <Link to={`/hunts/${this.props.match.params.huntId}/announcements`}>
              <FontAwesomeIcon icon={faBullhorn} />
              <span className="puzzle-list-link-label">Announcements</span>
            </Link>
          </li>
          <li>
            <Link to={`/hunts/${this.props.match.params.huntId}/guesses`}>
              <FontAwesomeIcon icon={faReceipt} />
              <span className="puzzle-list-link-label">Guess queue</span>
            </Link>
          </li>
          <li>
            <Link to={`/hunts/${this.props.match.params.huntId}/hunters`}>
              <FontAwesomeIcon icon={faUsers} />
              <span className="puzzle-list-link-label">Hunters</span>
            </Link>
          </li>
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
  // Assertion is safe because hunt is already subscribed and checked by HuntApp
  const hunt = Hunts.findOne({ _id: match.params.huntId })!;
  return {
    ready,
    canAdd: ready && Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.insert'),
    canUpdate: ready && Roles.userHasPermission(Meteor.userId(), 'mongo.puzzles.update'),
    allPuzzles: ready ? Puzzles.find({ hunt: match.params.huntId }).fetch() : [],
    allTags: ready ? Tags.find({ hunt: match.params.huntId }).fetch() : [],
    hunt,
  };
})(PuzzleListPage);

export default PuzzleListPageContainer;
