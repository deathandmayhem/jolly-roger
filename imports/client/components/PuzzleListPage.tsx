import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons/faBullhorn';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { faMap } from '@fortawesome/free-solid-svg-icons/faMap';
import { faReceipt } from '@fortawesome/free-solid-svg-icons/faReceipt';
import { faUsers } from '@fortawesome/free-solid-svg-icons/faUsers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
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

function showSolvedStorageKey(huntId: string): string {
  return `showsolved-${huntId}`;
}

class PuzzleListView extends React.Component<PuzzleListViewProps, PuzzleListViewState> {
  addModalRef: React.RefObject<PuzzleModalForm>

  searchBarRef: React.RefObject<HTMLInputElement>

  static displayName = 'PuzzleListView';

  constructor(props: PuzzleListViewProps) {
    super(props);
    const showSolvedKey = showSolvedStorageKey(props.huntId);
    const localStorageShowSolved = localStorage.getItem(showSolvedKey);
    const showSolved = !(localStorageShowSolved === 'false');
    this.state = {
      displayMode: 'group',
      showSolved,
    };
    this.addModalRef = React.createRef();
    this.searchBarRef = React.createRef();
  }

  componentDidMount() {
    this.searchBarRef.current!.focus();
    window.addEventListener('keydown', this.maybeStealCtrlF);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.maybeStealCtrlF);
  }

  maybeStealCtrlF = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      const node = this.searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  };

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

  clearSearch = () => {
    this.setSearchString('');
  };

  switchView = (newMode: 'group' | 'unlock') => {
    this.setState({
      displayMode: newMode,
    });
  };

  changeShowSolved = () => {
    this.setState((oldState) => {
      const newState = !oldState.showSolved;
      // Try to save the new state in localStorage, so that we'll use the
      // last-set value again the next time we load up this view.
      try {
        // Note: localStorage serialization converts booleans to strings anyway
        localStorage.setItem(showSolvedStorageKey(this.props.huntId), `${newState}`);
      } catch (e) {
        // Ignore failure to set value in storage; this is best-effort and if
        // localStorage isn't available then whatever
      }
      return {
        showSolved: newState,
      };
    });
  };

  showAddModal = () => {
    if (this.addModalRef.current) {
      this.addModalRef.current.show();
    }
  };

  renderList = (retainedPuzzles: PuzzleType[], solvedOverConstrains: boolean) => {
    const maybeMatchWarning = solvedOverConstrains && (
      <Alert variant="info">
        No matches found in unsolved puzzles; showing matches from solved puzzles
      </Alert>
    );
    const retainedIds = new Set(retainedPuzzles.map((puzzle) => puzzle._id));

    let listComponent;
    switch (this.state.displayMode) { // eslint-disable-line default-case
      case 'group': {
        // We group and sort first, and only filter afterward, to avoid losing the
        // relative group structure as a result of removing some puzzles from
        // consideration.
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
        listComponent = groupComponents;
        break;
      }
      case 'unlock': {
        const puzzlesByUnlock = _.sortBy(this.props.puzzles, (p) => { return p.createdAt; });
        const retainedPuzzlesByUnlock = puzzlesByUnlock.filter((p) => retainedIds.has(p._id));
        listComponent = (
          <PuzzleList
            puzzles={retainedPuzzlesByUnlock}
            allTags={this.props.allTags}
            layout="grid"
            canUpdate={this.props.canUpdate}
          />
        );
        break;
      }
    }
    return (
      <div>
        {maybeMatchWarning}
        {listComponent}
      </div>
    );
  };

  render() {
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

    const matchingSearch = this.puzzlesMatchingSearchString(this.props.puzzles);
    const matchingSearchAndSolved = this.puzzlesMatchingSolvedFilter(matchingSearch);
    // Normally, we'll just show matchingSearchAndSolved, but if that produces
    // no results, and there *is* a solved puzzle that is not being displayed due
    // to the solved filter, then show that and a note that we're showing solved
    // puzzles because no unsolved puzzles matched.
    const solvedOverConstrains = matchingSearch.length > 0 && matchingSearchAndSolved.length === 0;
    const retainedPuzzles = solvedOverConstrains ? matchingSearch : matchingSearchAndSolved;

    return (
      <div>
        <FormGroup>
          <div className="puzzle-view-controls">
            <div className="puzzle-view-controls-section">
              <FormLabel>View puzzles by:</FormLabel>
              <ButtonToolbar className="puzzle-view-buttons">
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
            </div>
            <div className="puzzle-view-controls-section expand">
              <FormLabel htmlFor="jr-puzzle-search">
                {`Showing ${retainedPuzzles.length}/${this.props.puzzles.length} items`}
              </FormLabel>
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
            </div>
            <ButtonToolbar>
              {addPuzzleContent}
            </ButtonToolbar>
          </div>
        </FormGroup>
        {this.renderList(retainedPuzzles, solvedOverConstrains)}
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
