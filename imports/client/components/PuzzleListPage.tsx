import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons/faBullhorn';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { faFaucet } from '@fortawesome/free-solid-svg-icons/faFaucet';
import { faMap } from '@fortawesome/free-solid-svg-icons/faMap';
import { faReceipt } from '@fortawesome/free-solid-svg-icons/faReceipt';
import { faUserCog } from '@fortawesome/free-solid-svg-icons/faUserCog';
import { faUsers } from '@fortawesome/free-solid-svg-icons/faUsers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, {
  useCallback, useEffect, useRef,
} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import FormLabel from 'react-bootstrap/FormLabel';
import InputGroup from 'react-bootstrap/InputGroup';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import Tooltip from 'react-bootstrap/Tooltip';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import Hunts from '../../lib/models/Hunts';
import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import { filteredPuzzleGroups, puzzleGroupsByRelevance } from '../../lib/puzzle-sort-and-group';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import createPuzzle from '../../methods/createPuzzle';
import {
  useHuntPuzzleListCollapseGroups,
  useHuntPuzzleListDisplayMode,
  useHuntPuzzleListShowSolved,
  useOperatorActionsHiddenForHunt,
} from '../hooks/persisted-state';
import PuzzleList from './PuzzleList';
import PuzzleModalForm, {
  PuzzleModalFormHandle, PuzzleModalFormSubmitPayload,
} from './PuzzleModalForm';
import RelatedPuzzleGroup from './RelatedPuzzleGroup';
import { mediaBreakpointDown } from './styling/responsive';

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
  ${mediaBreakpointDown('xs', css`
    &:not(:last-child) {
      margin-right: 0;
      margin-bottom: 0.5em;
    }
    flex-basis: 100%;
  `)}
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

const PuzzleListView = ({
  huntId, canAdd, canUpdate,
}: {
  huntId: string
  canAdd: boolean;
  canUpdate: boolean;
}) => {
  const allPuzzles = useTracker(() => Puzzles.find({ hunt: huntId }).fetch(), [huntId]);
  const allTags = useTracker(() => Tags.find({ hunt: huntId }).fetch(), [huntId]);

  const deletedPuzzlesLoading = useSubscribe(
    canUpdate ? 'mongo.puzzles.deleted' : undefined,
    { hunt: huntId }
  );
  const deletedLoading = deletedPuzzlesLoading();
  const deletedPuzzles = useTracker(() => (
    !canUpdate || deletedLoading ?
      undefined :
      Puzzles.findDeleted({ hunt: huntId }).fetch()
  ), [canUpdate, huntId, deletedLoading]);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get('q') || '';
  const addModalRef = useRef<PuzzleModalFormHandle>(null);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const [displayMode, setDisplayMode] = useHuntPuzzleListDisplayMode(huntId);
  const [showSolved, setShowSolved] = useHuntPuzzleListShowSolved(huntId);
  const [huntPuzzleListCollapseGroups, setHuntPuzzleListCollapseGroups] =
    useHuntPuzzleListCollapseGroups(huntId);
  const expandAllGroups = useCallback(() => {
    setHuntPuzzleListCollapseGroups({});
  }, [setHuntPuzzleListCollapseGroups]);
  const canExpandAllGroups = displayMode === 'group' &&
    Object.values(huntPuzzleListCollapseGroups).some((collapsed) => collapsed);

  const [operatorActionsHidden, setOperatorActionsHidden] = useOperatorActionsHiddenForHunt(huntId);
  const toggleOperatorActionsHidden = useCallback(() => {
    setOperatorActionsHidden((h) => !h);
  }, [setOperatorActionsHidden]);

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
    window.addEventListener('keydown', maybeStealCtrlF);
    return () => {
      window.removeEventListener('keydown', maybeStealCtrlF);
    };
  }, [maybeStealCtrlF]);

  const onAdd = useCallback((
    state: PuzzleModalFormSubmitPayload,
    callback: (error?: Error) => void
  ) => {
    const { docType, ...rest } = state;
    if (!docType) {
      callback(new Error('No docType provided'));
      return;
    }

    createPuzzle.call({ docType, ...rest }, callback);
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
    allTags.forEach((t) => {
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
  }, [allTags]);

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

  const changeShowSolved = useCallback(() => {
    setShowSolved((oldState) => !oldState);
  }, [setShowSolved]);

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
        const unfilteredGroups = puzzleGroupsByRelevance(allPuzzles, allTags);
        const puzzleGroups = filteredPuzzleGroups(unfilteredGroups, retainedIds);
        const groupComponents = puzzleGroups.map((g) => {
          const suppressedTagIds = [];
          if (g.sharedTag) {
            suppressedTagIds.push(g.sharedTag._id);
          }
          return (
            <RelatedPuzzleGroup
              key={g.sharedTag ? g.sharedTag._id : 'ungrouped'}
              huntId={huntId}
              group={g}
              noSharedTagLabel="(no group specified)"
              allTags={allTags}
              includeCount={false}
              canUpdate={canUpdate}
              suppressedTagIds={suppressedTagIds}
              trackPersistentExpand={searchString === ''}
            />
          );
        });
        listComponent = (
          <>
            <Button
              variant={canExpandAllGroups ? 'secondary' : 'outline-secondary'}
              size="sm"
              className="mb-2"
              disabled={!canExpandAllGroups}
              onClick={expandAllGroups}
            >
              Expand all
            </Button>
            {groupComponents}
          </>
        );
        break;
      }
      case 'unlock': {
        const puzzlesByUnlock = _.sortBy(allPuzzles, (p) => { return p.createdAt; });
        const retainedPuzzlesByUnlock = puzzlesByUnlock.filter((p) => retainedIds.has(p._id));
        listComponent = (
          <PuzzleList
            puzzles={retainedPuzzlesByUnlock}
            allTags={allTags}
            canUpdate={canUpdate}
          />
        );
        break;
      }
    }
    return (
      <div>
        {maybeMatchWarning}
        {listComponent}
        {deletedPuzzles && deletedPuzzles.length > 0 && (
          <RelatedPuzzleGroup
            key="deleted"
            huntId={huntId}
            group={{ puzzles: deletedPuzzles, subgroups: [] }}
            noSharedTagLabel="Deleted puzzles (operator only)"
            allTags={allTags}
            includeCount={false}
            canUpdate={canUpdate}
            suppressedTagIds={[]}
            trackPersistentExpand={searchString !== ''}
          />
        )}
      </div>
    );
  }, [
    huntId,
    displayMode,
    allPuzzles,
    deletedPuzzles,
    allTags,
    canUpdate,
    searchString,
    canExpandAllGroups,
    expandAllGroups,
  ]);

  const addPuzzleContent = canAdd && (
    <>
      <PuzzleModalForm
        huntId={huntId}
        tags={allTags}
        ref={addModalRef}
        onSubmit={onAdd}
      />
      <ButtonGroup>
        <Button variant="primary" onClick={showAddModal}>Add a puzzle</Button>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="operator-mode-tooltip">
              Show/hide operator actions (currently
              {' '}
              {operatorActionsHidden ? 'hidden' : 'visible'}
              )
            </Tooltip>
          )}
        >
          <Button
            variant={operatorActionsHidden ? 'outline-primary' : 'primary'}
            onClick={toggleOperatorActionsHidden}
          >
            <FontAwesomeIcon icon={faUserCog} />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    </>
  );

  const matchingSearch = puzzlesMatchingSearchString(allPuzzles);
  const matchingSearchAndSolved = puzzlesMatchingSolvedFilter(matchingSearch);
  // Normally, we'll just show matchingSearchAndSolved, but if that produces
  // no results, and there *is* a solved puzzle that is not being displayed due
  // to the solved filter, then show that and a note that we're showing solved
  // puzzles because no unsolved puzzles matched.
  const solvedOverConstrains = matchingSearch.length > 0 && matchingSearchAndSolved.length === 0;
  const retainedPuzzles = solvedOverConstrains ? matchingSearch : matchingSearchAndSolved;

  return (
    <div>
      <FormGroup className="mb-3">
        <ViewControls>
          <ViewControlsSection>
            <FormLabel>View puzzles by:</FormLabel>
            <ButtonToolbar className="puzzle-view-buttons">
              <ToggleButtonGroup type="radio" className="mr-2" name="puzzle-view" defaultValue="group" value={displayMode} onChange={setDisplayMode}>
                <ToggleButton id="view-group-button" variant="outline-info" value="group">Group</ToggleButton>
                <ToggleButton id="view-unlock-button" variant="outline-info" value="unlock">Unlock</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                type="checkbox"
                value={showSolved ? ['true'] : []}
                onChange={changeShowSolved}
              >
                <ToggleButton id="view-show-solved-button" variant="outline-info" value="true">Show solved</ToggleButton>
              </ToggleButtonGroup>
            </ButtonToolbar>
          </ViewControlsSection>
          <ViewControlsSectionExpand>
            <FormLabel htmlFor="jr-puzzle-search">
              {`Showing ${retainedPuzzles.length}/${allPuzzles.length} items`}
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
                <Button variant="secondary" onClick={clearSearch}>
                  <FontAwesomeIcon icon={faEraser} />
                </Button>
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

const StyledPuzzleListLinkList = styled.ul`
  list-style: none;
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  width: 100%;
  margin: 0 0 8px;
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
  ${mediaBreakpointDown('sm', css`
    display: none;
  `)}
`;

const PuzzleListPage = () => {
  const huntId = useParams<'huntId'>().huntId!;

  const puzzlesLoading = useSubscribe('mongo.puzzles', { hunt: huntId });
  const tagsLoading = useSubscribe('mongo.tags', { hunt: huntId });
  const loading = puzzlesLoading() || tagsLoading();

  // Don't bother including these in loading - it's ok if they trickle in
  useSubscribe('mongo.mediasoup_call_histories', { hunt: huntId });
  useSubscribe('subscribers.counts', { hunt: huntId });

  // Assertion is safe because hunt is already subscribed and checked by HuntApp
  const hunt = useTracker(() => Hunts.findOne(huntId)!, [huntId]);
  const { canAdd, canUpdate } = useTracker(() => {
    return {
      canAdd: userMayWritePuzzlesForHunt(Meteor.userId(), huntId),
      canUpdate: userMayWritePuzzlesForHunt(Meteor.userId(), huntId),
    };
  }, [huntId]);

  const huntLink = hunt.homepageUrl && (
    <StyledPuzzleListExternalLink>
      <Button as="a" href={hunt.homepageUrl} className="rounded-0" target="_blank" rel="noopener noreferrer" title="Open the hunt homepage">
        <FontAwesomeIcon icon={faMap} />
      </Button>
    </StyledPuzzleListExternalLink>
  );
  const puzzleList = loading ? (
    <span>loading...</span>
  ) : (
    <PuzzleListView
      huntId={huntId}
      canAdd={canAdd}
      canUpdate={canUpdate}
    />
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
        {/* Show firehose link only to operators */}
        {canUpdate && (
          <StyledPuzzleListLink>
            <StyledPuzzleListLinkAnchor to={`/hunts/${huntId}/firehose`}>
              <FontAwesomeIcon icon={faFaucet} />
              <StyledPuzzleListLinkLabel>Firehose</StyledPuzzleListLinkLabel>
            </StyledPuzzleListLinkAnchor>
          </StyledPuzzleListLink>
        )}
      </StyledPuzzleListLinkList>
      {puzzleList}
    </div>
  );
};

export default PuzzleListPage;
