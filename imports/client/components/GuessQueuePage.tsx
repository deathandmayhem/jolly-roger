/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { faBackward } from '@fortawesome/free-solid-svg-icons/faBackward';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faCopy } from '@fortawesome/free-solid-svg-icons/faCopy';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons/faExclamationCircle';
import { faForward } from '@fortawesome/free-solid-svg-icons/faForward';
import { faPuzzlePiece } from '@fortawesome/free-solid-svg-icons/faPuzzlePiece';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons/faSkullCrossbones';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons/faTimesCircle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { calendarTimeFormat } from '../../lib/calendarTimeFormat';
import { indexedById } from '../../lib/listUtils';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import { indexedDisplayNames } from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import { userMayUpdateGuessesForHunt } from '../../lib/permission_stubs';
import { GuessType } from '../../lib/schemas/Guess';
import { HuntType } from '../../lib/schemas/Hunt';
import { PuzzleType } from '../../lib/schemas/Puzzle';
import setGuessState from '../../methods/setGuessState';
import { guessURL } from '../../model-helpers';
import { useBreadcrumb } from '../hooks/breadcrumb';
import useSubscribeDisplayNames from '../hooks/useSubscribeDisplayNames';
import markdown from '../markdown';
import PuzzleAnswer from './PuzzleAnswer';
import Breakable from './styling/Breakable';
import { NavBarHeight } from './styling/constants';
import { Breakpoint, mediaBreakpointDown } from './styling/responsive';

const compactViewBreakpoint: Breakpoint = 'lg';

const StyledTable = styled.div`
  display: grid;
  grid-template-columns:
    [timestamp] auto
    [submitter] auto
    [puzzle] auto
    [answer] auto
    [direction] minmax(200px, auto)
    [confidence] minmax(200px, auto)
    [status] auto
    [actions] auto;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    grid-template-columns: auto;
  `)}
`;

const StyledHeaderRow = styled.div`
  display: contents;
`;

const StyledHeader = styled.div`
  position: sticky;
  top: ${NavBarHeight};
  background-color: white;
  font-weight: bold;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    display: none;
  `)}
`;

const StyledRow = styled.div<{ $state: GuessType['state'] }>`
  display: contents;
  margin-bottom: 8px;

  * {
    background-color:
      ${(props) => {
    switch (props.$state) {
      case 'correct':
        return '#f0fff0';
      case 'intermediate':
        return '#fffff0';
      case 'incorrect':
        return '#fff0f0';
      case 'rejected':
        return '#f0f0f0';
      case 'pending':
        return '#f0f0ff';
      default:
        return '#fff';
    }
  }};
  }

  :hover * {
    background-color:
      ${(props) => {
    switch (props.$state) {
      case 'correct':
        return '#d0ffd0';
      case 'intermediate':
        return '#ffffd0';
      case 'incorrect':
        return '#ffd0d0';
      case 'rejected':
        return '#d0d0d0';
      case 'pending':
        return '#d0d0ff';
      default:
        return '#fff';
    }
  }};
  }
`;

const StyledCell = styled.div`
  padding: 4px;
`;

const StyledLinkButton = styled(Button)`
  padding: 0;
  vertical-align: baseline;
`;

const StyledPuzzleTimestampAndSubmitter = styled.div`
  display: contents;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    padding: 4px;
    display: flex;
    & > * {
      padding: 0;
    }
  `)}
`;

const StyledPuzzleTimestamp = styled(StyledCell)`
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    ::after {
      content: " submitted by ";
      white-space: pre;
    }
  `)}
`;

const StyledPuzzleCell = styled(StyledCell)`
  display: flex;
  align-items: start;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    &::before {
      content: "Puzzle: ";
      white-space: pre;
    }
  `)}
`;

const StyledGuessCell = styled(StyledCell)`
  display: flex;
  align-items: start;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    &::before {
      content: "Guess: ";
      white-space: pre;
    }
  `)}
`;

const StyledGuessSliders = styled.div`
  display: contents;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    display: flex;
  `)}
`;

const StyledGuessSliderCell = styled(StyledCell)`
  display: flex;
  align-items: center;
  flex-grow: 1;
`;

const StyledGuessSliderWithLabel = styled(StyledCell)`
  display: contents;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex-grow: 1;
  `)}
`;

const StyledGuessSliderLabel = styled.span`
  display: none;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    display: inline;
  `)}
`;

const StyledSlider = styled.input`
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    width: 1px;
    flex-grow: 1;
  `)}
`;

const StyledTooltipCompact = styled.span`
  display: none;
  white-space: pre;
  ${mediaBreakpointDown(compactViewBreakpoint, css`
    display: inline;
  `)}
`;

const StyledAdditionalNotes = styled(StyledCell)`
  grid-column: 1 / -1;
  overflow: hidden;
`;

const GuessBlock = React.memo(({
  canEdit, hunt, guess, createdByDisplayName, puzzle,
}: {
  canEdit: boolean;
  hunt: HuntType;
  guess: GuessType;
  createdByDisplayName: string;
  puzzle: PuzzleType;
}) => {
  const markPending = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'pending' });
  }, [guess._id]);

  const puzzleTooltip = (
    <Tooltip id={`guess-${guess._id}-puzzle-tooltip`}>
      Open puzzle
    </Tooltip>
  );
  const discussionTooltip = (
    <Tooltip id={`guess-${guess._id}-discussion-tooltip`}>
      Open Jolly Roger discussion
    </Tooltip>
  );
  const copyTooltip = (
    <Tooltip id={`guess-${guess._id}-copy-tooltip`}>
      Copy to clipboard
    </Tooltip>
  );
  const directionTooltip = (
    <Tooltip id={`guess-${guess._id}-direction-tooltip`}>
      <StyledTooltipCompact>
        Solve direction:
        {' '}
      </StyledTooltipCompact>
      {guess.direction}
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id={`guess-${guess._id}-confidence-tooltip`}>
      <StyledTooltipCompact>
        Confidence:
        {' '}
      </StyledTooltipCompact>
      {guess.confidence}
    </Tooltip>
  );

  let displayState;
  switch (guess.state) {
    case 'correct':
      displayState = (
        <>
          <FontAwesomeIcon icon={faCheckCircle} color="#00ff00" fixedWidth />
          {' '}
          Correct
        </>
      );
      break;
    case 'intermediate':
      displayState = (
        <>
          <FontAwesomeIcon icon={faExclamationCircle} color="#dddd00" fixedWidth />
          {' '}
          Intermediate answer
        </>
      );
      break;
    case 'incorrect':
      displayState = (
        <>
          <FontAwesomeIcon icon={faTimesCircle} color="#ff0000" fixedWidth />
          {' '}
          Incorrect
        </>
      );
      break;
    case 'rejected':
      displayState = (
        <>
          <FontAwesomeIcon icon={faBan} color="#000000" fixedWidth />
          {' '}
          Rejected
        </>
      );
      break;
    case 'pending':
      displayState = (
        <>
          <FontAwesomeIcon icon={faClock} color="#0000ff" fixedWidth />
          {' '}
          Pending
        </>
      );
      break;
    default:
      displayState = 'unknown';
  }

  return (
    <StyledRow $state={guess.state}>
      <StyledPuzzleTimestampAndSubmitter>
        <StyledPuzzleTimestamp>{calendarTimeFormat(guess.createdAt)}</StyledPuzzleTimestamp>
        <StyledCell><Breakable>{createdByDisplayName}</Breakable></StyledCell>
      </StyledPuzzleTimestampAndSubmitter>
      <StyledPuzzleCell>
        <OverlayTrigger placement="top" overlay={puzzleTooltip}>
          <a href={guessURL(hunt, puzzle)} target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faPuzzlePiece} fixedWidth />
          </a>
        </OverlayTrigger>
        {' '}
        <OverlayTrigger placement="top" overlay={discussionTooltip}>
          <Link to={`/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`}>
            <FontAwesomeIcon icon={faSkullCrossbones} fixedWidth />
          </Link>
        </OverlayTrigger>
        {' '}
        {puzzle.title}
      </StyledPuzzleCell>
      <StyledGuessCell>
        <OverlayTrigger placement="top" overlay={copyTooltip}>
          {({ ref, ...triggerHandler }) => (
            <CopyToClipboard text={guess.guess} {...triggerHandler}>
              <StyledLinkButton ref={ref} variant="link" aria-label="Copy">
                <FontAwesomeIcon icon={faCopy} fixedWidth />
              </StyledLinkButton>
            </CopyToClipboard>
          )}
        </OverlayTrigger>
        {' '}
        <PuzzleAnswer answer={guess.guess} />
      </StyledGuessCell>
      <StyledGuessSliders>
        <StyledGuessSliderWithLabel>
          <StyledGuessSliderLabel>
            Solve direction
          </StyledGuessSliderLabel>
          <OverlayTrigger placement="top" overlay={directionTooltip}>
            <StyledGuessSliderCell>
              <FontAwesomeIcon icon={faBackward} fixedWidth />
              {' '}
              <StyledSlider type="range" min="-10" max="10" value={guess.direction} disabled list={`guess-${guess._id}-direction-data`} />
              <datalist id={`guess-${guess._id}-direction-data`}>
                <option value="-10">-10</option>
                <option value="0">0</option>
                <option value="10">10</option>
              </datalist>
              {' '}
              <FontAwesomeIcon icon={faForward} fixedWidth />
            </StyledGuessSliderCell>
          </OverlayTrigger>
        </StyledGuessSliderWithLabel>
        <StyledGuessSliderWithLabel>
          <StyledGuessSliderLabel>
            Confidence
          </StyledGuessSliderLabel>
          <OverlayTrigger placement="top" overlay={confidenceTooltip}>
            <StyledGuessSliderCell>
              0%
              {' '}
              <StyledSlider type="range" min="0" max="100" value={guess.confidence} disabled list={`guess-${guess._id}-confidence-data`} />
              <datalist id={`guess-${guess._id}-confidence-data`}>
                <option value="0">0%</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
              </datalist>
              {' '}
              100%
            </StyledGuessSliderCell>
          </OverlayTrigger>
        </StyledGuessSliderWithLabel>
      </StyledGuessSliders>
      <StyledCell>
        {displayState}
      </StyledCell>
      <StyledCell>
        {canEdit && guess.state !== 'pending' && (
          <Button variant="outline-secondary" size="sm" onClick={markPending}>Return to queue</Button>
        )}
      </StyledCell>
      {guess.additionalNotes && (
        <StyledAdditionalNotes
          dangerouslySetInnerHTML={{ __html: markdown(guess.additionalNotes) }}
        />
      )}
    </StyledRow>
  );
});

const GuessQueuePage = () => {
  const huntId = useParams<'huntId'>().huntId!;
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.get('q') ?? '';

  useBreadcrumb({ title: 'Guess queue', path: `/hunts/${huntId}/guesses` });

  const huntLoading = useSubscribe('mongo.hunts', { _id: huntId });
  const guessesLoading = useSubscribe('mongo.guesses', { hunt: huntId });
  const puzzlesLoading = useSubscribe('mongo.puzzles', { hunt: huntId });
  const displayNamesLoading = useSubscribeDisplayNames(huntId);
  const loading =
    huntLoading() ||
    guessesLoading() ||
    puzzlesLoading() ||
    displayNamesLoading();

  const hunt = useTracker(() => Hunts.findOne({ _id: huntId }), [huntId]);
  const guesses = useTracker(() => (loading ? [] : Guesses.find({ hunt: huntId }, { sort: { createdAt: -1 } }).fetch()), [huntId, loading]);
  const puzzles = useTracker(() => (loading ? new Map<string, PuzzleType>() : indexedById(Puzzles.find({ hunt: huntId }).fetch())), [huntId, loading]);
  const displayNames = useTracker(() => (loading ? {} : indexedDisplayNames()), [loading]);
  const canEdit = useTracker(() => userMayUpdateGuessesForHunt(Meteor.user(), huntId), [huntId]);

  const searchBarRef = useRef<HTMLInputElement>(null);

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

  const setSearchString = useCallback((val: string) => {
    const u = new URLSearchParams(searchParams);
    if (val) {
      u.set('q', val);
    } else {
      u.delete('q');
    }
    setSearchParams(u);
  }, [searchParams, setSearchParams]);

  const onSearchStringChange: NonNullable<FormControlProps['onChange']> = useCallback((e) => {
    setSearchString(e.currentTarget.value);
  }, [setSearchString]);

  const clearSearch = useCallback(() => {
    setSearchString('');
  }, [setSearchString]);

  const compileMatcher = useCallback((searchKeys: string[]): (g: GuessType) => boolean => {
    // Given a list a search keys, compileMatcher returns a function that,
    // given a guess, returns true if all search keys match that guess in
    // some way, and false if any of the search keys cannot be found in
    // either the guess or the puzzle title.
    const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
    return (guess) => {
      const puzzle = puzzles.get(guess.puzzle)!;
      const guessText = guess.guess.toLowerCase();

      const titleWords = puzzle.title.toLowerCase().split(' ');
      // For each search key, if nothing from the text or the title match,
      // reject this guess.
      return lowerSearchKeys.every((key) => {
        return guessText.includes(key) || titleWords.some((word) => word.startsWith(key));
      });
    };
  }, [puzzles]);

  const filteredGuesses = useCallback((allGuesses: GuessType[]) => {
    const searchKeys = searchString.split(' ');
    let interestingGuesses;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      interestingGuesses = allGuesses;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingGuesses = allGuesses.filter(isInteresting);
    }

    return interestingGuesses;
  }, [searchString, compileMatcher]);

  if (loading || !hunt) {
    return <div>loading...</div>;
  }

  const directionTooltip = (
    <Tooltip id="direction-tooltip">
      Direction this puzzle was solved, ranging from completely backsolved (-10) to completely forward solved (10)
    </Tooltip>
  );
  const confidenceTooltip = (
    <Tooltip id="confidence-tooltip">
      Submitter-estimated likelihood that this answer is correct
    </Tooltip>
  );

  return (
    <div>
      <h1>Guess queue</h1>
      <FormGroup className="mb-3">
        <InputGroup>
          <FormControl
            id="jr-guess-search"
            as="input"
            type="text"
            ref={searchBarRef}
            placeholder="Filter by title or answer"
            value={searchString}
            onChange={onSearchStringChange}
          />
          <Button variant="secondary" onClick={clearSearch}>
            <FontAwesomeIcon icon={faEraser} />
          </Button>
        </InputGroup>
      </FormGroup>
      <StyledTable>
        <StyledHeaderRow>
          <StyledHeader>Time</StyledHeader>
          <StyledHeader>Submitter</StyledHeader>
          <StyledHeader>Puzzle</StyledHeader>
          <StyledHeader>Answer</StyledHeader>
          <OverlayTrigger placement="top" overlay={directionTooltip}>
            <StyledHeader>
              Direction
            </StyledHeader>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={confidenceTooltip}>
            <StyledHeader>
              Confidence
            </StyledHeader>
          </OverlayTrigger>
          <StyledHeader>Status</StyledHeader>
          <StyledHeader>&nbsp;</StyledHeader>
        </StyledHeaderRow>
        {filteredGuesses(guesses).map((guess) => {
          return (
            <GuessBlock
              key={guess._id}
              hunt={hunt}
              guess={guess}
              createdByDisplayName={displayNames[guess.createdBy] ?? '???'}
              puzzle={puzzles.get(guess.puzzle)!}
              canEdit={canEdit}
            />
          );
        })}
      </StyledTable>
    </div>
  );
};

export default GuessQueuePage;
