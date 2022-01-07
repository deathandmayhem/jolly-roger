import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons/faBullhorn';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { faMap } from '@fortawesome/free-solid-svg-icons/faMap';
import { faReceipt } from '@fortawesome/free-solid-svg-icons/faReceipt';
import { faUsers } from '@fortawesome/free-solid-svg-icons/faUsers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import InputGroup from 'react-bootstrap/InputGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import Hunts from '../../lib/models/hunts';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import { HuntType } from '../../lib/schemas/hunt';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { TagType } from '../../lib/schemas/tag';
import PuzzleList from './PuzzleList';
import PuzzleModalForm, {
  PuzzleModalFormHandle, PuzzleModalFormSubmitPayload,
} from './PuzzleModalForm';
import RelatedPuzzleGroup from './RelatedPuzzleGroup';
import { filteredPuzzleGroups, puzzleGroupsByRelevance } from './puzzle-sort-and-group';
import { mediaBreakpointDown } from './styling/responsive';

interface PuzzleListViewProps {
  huntId: string
  canAdd: boolean;
  canUpdate: boolean;
  puzzles: PuzzleType[];
  allTags: TagType[];
}

const ViewControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
`;

const ViewControlsSection = styled.div`
  &:not(:last-child) {
    margin-right: 0.5em;
  }
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;

  ${mediaBreakpointDown('xs')`
    &:not(:last-child) {
      margin-right: 0;
      margin-bottom: 0.5em;
    }
    flex-basis: 100%;
  `}
`;

const ViewControlsSectionExpand = styled(ViewControlsSection)`
  flex: 1 1 auto;
`;

const FilterToolbar = styled(ButtonToolbar)`
  flex: 1 1 auto;
  width: 100%;
`;

const FilterToolbarInputGroup = styled(InputGroup)`
  /* precedence boost needed because otherwise default input group styling is more specific */
  && {
    width: 100%;
  }
`;

function showSolvedStorageKey(huntId: string): string {
  return `showsolved-${huntId}`;
}

const PuzzleListView = (props: PuzzleListViewProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get('q') || '';
  const addModalRef = useRef<PuzzleModalFormHandle>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const [displayMode, setDisplayMode] = useState<string>('group');
  const [showSolved, setShowSolved] = useState<boolean>(() => {
    const showSolvedKey = showSolvedStorageKey(props.huntId);
    const localStorageShowSolved = localStorage.getItem(showSolvedKey);
    return !(localStorageShowSolved === 'false');
  });

  const maybeStealCtrlF = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      const node = searchBarRef.current;
      if (node) {
        node.focus();
      }
    }
  }, []);

  useEffect(() => {
    // Focus search bar on page load
    if (searchBarRef.current) {
      searchBarRef.current.focus();
    }
    window.addEventListener('keydown', maybeStealCtrlF);
    return () => {
      window.removeEventListener('keydown', maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

  const onAdd = useCallback((
    state: PuzzleModalFormSubmitPayload,
    callback: (error?: Error) => void
  ) => {
    const { docType, ...puzzle } = state;
    Meteor.call('createPuzzle', puzzle, docType, callback);
  }, []);

  const setSearchString = useCallback((val: string) => {
    const u = new URLSearchParams(searchParams);
    if (val) {
      u.set('q', val);
    } else {
      u.delete('q');
    }

    setSearchParams(u);
  }, [searchParams, setSearchParams]);

  const onSearchStringChange: FormControlProps['onChange'] = useCallback((e) => {
    setSearchString(e.currentTarget.value);
  }, [setSearchString]);

  const compileMatcher = useCallback((searchKeys: string[]): (p: PuzzleType) => boolean => {
    const tagNames: Record<string, string> = {};
    props.allTags.forEach((t) => {
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
  }, [props.allTags]);

  const puzzlesMatchingSearchString = useCallback((puzzles: PuzzleType[]): PuzzleType[] => {
    const searchKeys = searchString.split(' ');
    if (searchKeys.length === 1 && searchKeys[0] === '') {
      // No search query, so no need to do fancy search computation
      return puzzles;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
      return puzzles.filter(isInteresting);
    }
  }, [searchString, compileMatcher]);

  const puzzlesMatchingSolvedFilter = useCallback((puzzles: PuzzleType[]): PuzzleType[] => {
    if (showSolved) {
      return puzzles;
    } else {
      return puzzles.filter((puzzle) => {
        // Items with no expected answer are always shown, since they're
        // generally pinned administrivia.
        return (puzzle.expectedAnswerCount === 0 ||
          puzzle.answers.length < puzzle.expectedAnswerCount);
      });
    }
  }, [showSolved]);

  const clearSearch = useCallback(() => {
    setSearchString('');
  }, [setSearchString]);

  const switchView = useCallback((newMode: 'group' | 'unlock') => {
    setDisplayMode(newMode);
  }, []);

  const changeShowSolved = useCallback(() => {
    setShowSolved((oldState) => {
      const newState = !oldState;
      // Try to save the new state in localStorage, so that we'll use the
      // last-set value again the next time we load up this view.
      try {
        // Note: localStorage serialization converts booleans to strings anyway
        localStorage.setItem(showSolvedStorageKey(props.huntId), `${newState}`);
      } catch (e) {
        // Ignore failure to set value in storage; this is best-effort and if
        // localStorage isn't available then whatever
      }
      return newState;
    });
  }, [props.huntId]);

  const showAddModal = useCallback(() => {
    if (addModalRef.current) {
      addModalRef.current.show();
    }
  }, []);

  const renderList = useCallback((retainedPuzzles: PuzzleType[], solvedOverConstrains: boolean) => {
    const maybeMatchWarning = solvedOverConstrains && (
      <Alert variant="info">
        No matches found in unsolved puzzles; showing matches from solved puzzles
      </Alert>
    );
    const retainedIds = new Set(retainedPuzzles.map((puzzle) => puzzle._id));

    let listComponent;
    switch (displayMode) { // eslint-disable-line default-case
      case 'group': {
        // We group and sort first, and only filter afterward, to avoid losing the
        // relative group structure as a result of removing some puzzles from
        // consideration.
        const unfilteredGroups = puzzleGroupsByRelevance(props.puzzles, props.allTags);
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
              allTags={props.allTags}
              includeCount={false}
              layout="grid"
              canUpdate={props.canUpdate}
              suppressedTagIds={suppressedTagIds}
            />
          );
        });
        listComponent = groupComponents;
        break;
      }
      case 'unlock': {
        const puzzlesByUnlock = _.sortBy(props.puzzles, (p) => { return p.createdAt; });
        const retainedPuzzlesByUnlock = puzzlesByUnlock.filter((p) => retainedIds.has(p._id));
        listComponent = (
          <PuzzleList
            puzzles={retainedPuzzlesByUnlock}
            allTags={props.allTags}
            layout="grid"
            canUpdate={props.canUpdate}
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
  }, [displayMode, props.puzzles, props.allTags, props.canUpdate]);

  const addPuzzleContent = props.canAdd && (
    <>
      <Button variant="primary" onClick={showAddModal}>Add a puzzle</Button>
      <PuzzleModalForm
        huntId={props.huntId}
        tags={props.allTags}
        ref={addModalRef}
        onSubmit={onAdd}
      />
    </>
  );

  const matchingSearch = puzzlesMatchingSearchString(props.puzzles);
  const matchingSearchAndSolved = puzzlesMatchingSolvedFilter(matchingSearch);
  // Normally, we'll just show matchingSearchAndSolved, but if that produces
  // no results, and there *is* a solved puzzle that is not being displayed due
  // to the solved filter, then show that and a note that we're showing solved
  // puzzles because no unsolved puzzles matched.
  const solvedOverConstrains = matchingSearch.length > 0 && matchingSearchAndSolved.length === 0;
  const retainedPuzzles = solvedOverConstrains ? matchingSearch : matchingSearchAndSolved;

  return (
    <div>
      <FormGroup>
        <ViewControls>
          <ViewControlsSection>
            <FormLabel>View puzzles by:</FormLabel>
            <ButtonToolbar className="puzzle-view-buttons">
              <ToggleButtonGroup type="radio" className="mr-2" name="puzzle-view" defaultValue="group" value={displayMode} onChange={switchView}>
                <ToggleButton variant="outline-info" value="group">Group</ToggleButton>
                <ToggleButton variant="outline-info" value="unlock">Unlock</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                type="checkbox"
                value={showSolved ? ['true'] : []}
                onChange={changeShowSolved}
              >
                <ToggleButton variant="outline-info" value="true">Show solved</ToggleButton>
              </ToggleButtonGroup>
            </ButtonToolbar>
          </ViewControlsSection>
          <ViewControlsSectionExpand>
            <FormLabel htmlFor="jr-puzzle-search">
              {`Showing ${retainedPuzzles.length}/${props.puzzles.length} items`}
            </FormLabel>
            <FilterToolbar>
              <FilterToolbarInputGroup>
                <FormControl
                  id="jr-puzzle-search"
                  as="input"
                  type="text"
                  ref={searchBarRef}
                  placeholder="Filter by title, answer, or tag"
                  value={searchString}
                  onChange={onSearchStringChange}
                />
                <InputGroup.Append>
                  <Button variant="secondary" onClick={clearSearch}>
                    <FontAwesomeIcon icon={faEraser} />
                  </Button>
                </InputGroup.Append>
              </FilterToolbarInputGroup>
            </FilterToolbar>
          </ViewControlsSectionExpand>
          <ViewControlsSection>
            <ButtonToolbar>
              {addPuzzleContent}
            </ButtonToolbar>
          </ViewControlsSection>
        </ViewControls>
      </FormGroup>
      {renderList(retainedPuzzles, solvedOverConstrains)}
    </div>
  );
};

interface PuzzleListPageTracker {
  ready: boolean;
  canAdd: boolean;
  canUpdate: boolean;
  allPuzzles: PuzzleType[];
  allTags: TagType[];
  hunt: HuntType;
}

const StyledPuzzleListLinkList = styled.ul`
  list-style: none;
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  width: 100%;
  margin: 0 0 8px 0;
  padding: 0;
  border-color: #cfcfcf;
  border-style: solid;
  border-width: 1px 0;
`;

const StyledPuzzleListLink = styled.li`
  display: flex;
  align-items: stretch;
  flex: 1 1 0;
`;

const StyledPuzzleListLinkAnchor = styled(Link)`
  flex: 1 1 0;
  display: flex;
  height: 38px;
  align-items: center;
  align-content: center;
  justify-content: center;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  font-weight: bold;
  &:hover {
    background-color: #f8f8f8;
  }
`;

const StyledPuzzleListExternalLink = styled(StyledPuzzleListLink)`
  flex: 0 0 40px;
`;

const StyledPuzzleListLinkLabel = styled.span`
  margin-left: 4px;
  ${mediaBreakpointDown('sm')`
    display: none;
  `}
`;

const PuzzleListPage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  const tracker: PuzzleListPageTracker = useTracker(() => {
    const puzzlesHandle = Meteor.subscribe('mongo.puzzles', { hunt: huntId });
    const tagsHandle = Meteor.subscribe('mongo.tags', { hunt: huntId });

    // Don't bother including this in ready - it's ok if it trickles in
    Meteor.subscribe('subscribers.counts', { hunt: huntId });

    const ready = puzzlesHandle.ready() && tagsHandle.ready();
    // Assertion is safe because hunt is already subscribed and checked by HuntApp
    const hunt = Hunts.findOne({ _id: huntId })!;
    return {
      ready,
      canAdd: ready && userMayWritePuzzlesForHunt(Meteor.userId(), huntId),
      canUpdate: ready && userMayWritePuzzlesForHunt(Meteor.userId(), huntId),
      allPuzzles: ready ? Puzzles.find({ hunt: huntId }).fetch() : [],
      allTags: ready ? Tags.find({ hunt: huntId }).fetch() : [],
      hunt,
    };
  }, [huntId]);

  const huntLink = tracker.hunt.homepageUrl && (
    <StyledPuzzleListExternalLink>
      <Button as="a" href={tracker.hunt.homepageUrl} className="rounded-0" target="_blank" rel="noopener noreferrer" title="Open the hunt homepage">
        <FontAwesomeIcon icon={faMap} />
      </Button>
    </StyledPuzzleListExternalLink>
  );
  const puzzleList = tracker.ready ? (
    <PuzzleListView
      huntId={huntId}
      canAdd={tracker.canAdd}
      canUpdate={tracker.canUpdate}
      puzzles={tracker.allPuzzles}
      allTags={tracker.allTags}
    />
  ) : (
    <span>loading...</span>
  );
  return (
    <div>
      <StyledPuzzleListLinkList>
        {huntLink}
        <StyledPuzzleListLink>
          <StyledPuzzleListLinkAnchor to={`/hunts/${huntId}/announcements`}>
            <FontAwesomeIcon icon={faBullhorn} />
            <StyledPuzzleListLinkLabel>Announcements</StyledPuzzleListLinkLabel>
          </StyledPuzzleListLinkAnchor>
        </StyledPuzzleListLink>
        <StyledPuzzleListLink>
          <StyledPuzzleListLinkAnchor to={`/hunts/${huntId}/guesses`}>
            <FontAwesomeIcon icon={faReceipt} />
            <StyledPuzzleListLinkLabel>Guess queue</StyledPuzzleListLinkLabel>
          </StyledPuzzleListLinkAnchor>
        </StyledPuzzleListLink>
        <StyledPuzzleListLink>
          <StyledPuzzleListLinkAnchor to={`/hunts/${huntId}/hunters`}>
            <FontAwesomeIcon icon={faUsers} />
            <StyledPuzzleListLinkLabel>Hunters</StyledPuzzleListLinkLabel>
          </StyledPuzzleListLinkAnchor>
        </StyledPuzzleListLink>
      </StyledPuzzleListLinkList>
      {puzzleList}
    </div>
  );
};

export default PuzzleListPage;
