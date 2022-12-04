/* eslint-disable max-len */
import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
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
import Breakable from './styling/Breakable';

const AutoSelectInput = ({ value }: { value: string }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFocus = useCallback(() => {
    // Use the selection API to select the contents of this, for easier clipboarding.
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  return (
    <input
      ref={inputRef}
      readOnly
      value={value}
      onFocus={onFocus}
    />
  );
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StyledGuessBlock = styled.div<{ $state: GuessType['state'] }>`
  margin-bottom: 8px;
  display: flex;
  flex-direction: row;
  background-color:
    ${(props) => {
    switch (props.$state) {
      case 'correct':
        return '#f0fff0';
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
`;

const StyledGuessInfo = styled.div`
  flex: 1 0 50%;
  overflow-x: hidden;
`;

const StyledGuessButtonGroup = styled.div`
  flex: 0 1 330px;
  display: flex;
  flex-flow: row wrap;
  align-items: stretch;
  justify-content: space-between;
  padding: 0;
`;

const StyledGuessButton = styled.button`
  flex: 1 1 72px;
  border-radius: 5px;
  margin: 4px;
  border: 0;
  background-color: transparent;
`;

const StyledGuessButtonCorrect = styled(StyledGuessButton)`
  ${(props) => !props.disabled && css`
    border: 1px solid #00ff00;
    background-color: #f0fff0;
  `}
`;

const StyledGuessButtonIncorrect = styled(StyledGuessButton)`
  ${(props) => !props.disabled && css`
    border: 1px solid #ff0000;
    background-color: #fff0f0;
  `}
`;

const StyledGuessButtonRejected = styled(StyledGuessButton)`
  ${(props) => !props.disabled && css`
    border: 1px solid #000000;
    background-color: #f0f0f0;
  `}
`;

const StyledGuessButtonPending = styled(StyledGuessButton)`
  ${(props) => !props.disabled && css`
    border: 1px solid #0000ff;
    background-color: #f0f0ff;
  `}
`;

const formatDate = (date: Date) => {
  // We only care about days in so far as which day of hunt this guess was submitted on
  const day = daysOfWeek[date.getDay()];
  return `${date.toLocaleTimeString()} on ${day}`;
};

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

  const markCorrect = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'correct' });
  }, [guess._id]);

  const markIncorrect = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'incorrect' });
  }, [guess._id]);

  const markRejected = useCallback(() => {
    setGuessState.call({ guessId: guess._id, state: 'rejected' });
  }, [guess._id]);

  const timestamp = formatDate(guess.createdAt);
  const guessButtons = (
    <StyledGuessButtonGroup>
      <StyledGuessButtonCorrect onClick={markCorrect} disabled={guess.state === 'correct'}>Correct</StyledGuessButtonCorrect>
      <StyledGuessButtonIncorrect onClick={markIncorrect} disabled={guess.state === 'incorrect'}>Incorrect</StyledGuessButtonIncorrect>
      <StyledGuessButtonRejected onClick={markRejected} disabled={guess.state === 'rejected'}>Rejected</StyledGuessButtonRejected>
      <StyledGuessButtonPending onClick={markPending} disabled={guess.state === 'pending'}>Pending</StyledGuessButtonPending>
    </StyledGuessButtonGroup>
  );

  return (
    <StyledGuessBlock $state={guess.state}>
      <StyledGuessInfo>
        <div>
          {timestamp}
          {' from '}
          <Breakable>{createdByDisplayName || '<no name given>'}</Breakable>
        </div>
        <div>
          {'Puzzle: '}
          <a href={guessURL(hunt, puzzle)} target="_blank" rel="noopener noreferrer">{puzzle.title}</a>
          {' ('}
          <Link to={`/hunts/${puzzle.hunt}/puzzles/${puzzle._id}`}>discussion</Link>
          )
        </div>
        <div>
          {'Solve direction: '}
          {guess.direction}
        </div>
        <div>
          {'Confidence: '}
          {guess.confidence}
        </div>
        <div><AutoSelectInput value={guess.guess} /></div>
      </StyledGuessInfo>
      {canEdit ? guessButtons : <StyledGuessButtonGroup>{guess.state}</StyledGuessButtonGroup>}
    </StyledGuessBlock>
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
  const canEdit = useTracker(() => userMayUpdateGuessesForHunt(Meteor.userId(), huntId), [huntId]);

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
    </div>
  );
};

export default GuessQueuePage;
