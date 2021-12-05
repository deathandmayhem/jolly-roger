import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import { faEraser } from '@fortawesome/free-solid-svg-icons/faEraser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import Guesses from '../../lib/models/guesses';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { userMayUpdateGuessesForHunt } from '../../lib/permission_stubs';
import { GuessType } from '../../lib/schemas/guess';
import { HuntType } from '../../lib/schemas/hunt';
import { PuzzleType } from '../../lib/schemas/puzzle';
import { guessURL } from '../../model-helpers';
import { useBreadcrumb } from '../hooks/breadcrumb';
import Breakable from './styling/Breakable';

/* eslint-disable max-len */

interface AutoSelectInputProps {
  value: string;
}

const AutoSelectInput = (props: AutoSelectInputProps) => {
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
      value={props.value}
      onFocus={onFocus}
    />
  );
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface GuessBlockProps {
  canEdit: boolean;
  hunt: HuntType;
  guess: GuessType;
  createdByDisplayName: string;
  puzzle: PuzzleType;
}

const StyledGuessBlock = styled.div<{ $state: GuessType['state'] }>`
  margin-bottom: 8px;
  display: flex;
  flex-direction: row;
  background-color: ${(props) => {
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
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: space-between;
  padding: 0px;
`;

const StyledGuessButton = styled.button`
  flex: 1 1 72px;
  border-radius: 5px;
  margin: 4px;
  border: 0px;
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

const GuessBlock = React.memo((props: GuessBlockProps) => {
  const markPending = useCallback(() => {
    Meteor.call('markGuessPending', props.guess._id);
  }, [props.guess._id]);

  const markCorrect = useCallback(() => {
    Meteor.call('markGuessCorrect', props.guess._id);
  }, [props.guess._id]);

  const markIncorrect = useCallback(() => {
    Meteor.call('markGuessIncorrect', props.guess._id);
  }, [props.guess._id]);

  const markRejected = useCallback(() => {
    Meteor.call('markGuessRejected', props.guess._id);
  }, [props.guess._id]);

  const guess = props.guess;
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
          <Breakable>{props.createdByDisplayName || '<no name given>'}</Breakable>
        </div>
        <div>
          {'Puzzle: '}
          <a href={guessURL(props.hunt, props.puzzle)} target="_blank" rel="noopener noreferrer">{props.puzzle.title}</a>
          {' ('}
          <Link to={`/hunts/${props.puzzle.hunt}/puzzles/${props.puzzle._id}`}>discussion</Link>
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
      {props.canEdit ? guessButtons : <StyledGuessButtonGroup>{guess.state}</StyledGuessButtonGroup>}
    </StyledGuessBlock>
  );
});

interface GuessQueuePageParams {
  huntId: string;
}

interface GuessQueuePageWithRouterParams extends RouteComponentProps<GuessQueuePageParams> {
}

interface GuessQueuePageProps extends GuessQueuePageWithRouterParams {
  ready: boolean;
  hunt?: HuntType;
  guesses: GuessType[];
  puzzles: Record<string, PuzzleType>;
  displayNames: Record<string, string>;
  canEdit: boolean;
}

const GuessQueuePage = (props: GuessQueuePageWithRouterParams) => {
  useBreadcrumb({ title: 'Guess queue', path: `/hunts/${props.match.params.huntId}/guesses` });

  const tracker = useTracker(() => {
    const huntId = props.match.params.huntId;
    const huntHandle = Meteor.subscribe('mongo.hunts', {
      _id: huntId,
    });
    const guessesHandle = Meteor.subscribe('mongo.guesses', {
      hunt: huntId,
    });
    const puzzlesHandle = Meteor.subscribe('mongo.puzzles', {
      hunt: huntId,
    });
    const displayNamesHandle = Profiles.subscribeDisplayNames();
    const ready = huntHandle.ready() && guessesHandle.ready() && puzzlesHandle.ready() && displayNamesHandle.ready();
    const data: Pick<GuessQueuePageProps, Exclude<keyof GuessQueuePageProps, keyof GuessQueuePageWithRouterParams>> = {
      ready,
      guesses: [],
      puzzles: {},
      displayNames: {},
      canEdit: userMayUpdateGuessesForHunt(Meteor.userId(), huntId),
    };
    if (ready) {
      data.hunt = Hunts.findOne({ _id: huntId });
      data.guesses = Guesses.find({ hunt: huntId }, { sort: { createdAt: -1 } }).fetch();
      data.puzzles = _.indexBy(Puzzles.find({ hunt: huntId }).fetch(), '_id');
      data.displayNames = Profiles.displayNames();
    }

    return data;
  }, [props.match.params.huntId]);

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
    const u = new URLSearchParams(props.location.search);
    if (val) {
      u.set('q', val);
    } else {
      u.delete('q');
    }
    props.history.replace({
      pathname: props.location.pathname,
      search: u.toString(),
    });
  }, [props.history, props.location]);

  const onSearchStringChange: FormControlProps['onChange'] = useCallback((e) => {
    setSearchString(e.currentTarget.value);
  }, [setSearchString]);

  const getSearchString = useCallback((): string => {
    const u = new URLSearchParams(props.location.search);
    const s = u.get('q');
    return s || '';
  }, [props.location.search]);

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
      const puzzle = tracker.puzzles[guess.puzzle];
      const guessText = guess.guess.toLowerCase();

      const titleWords = puzzle.title.toLowerCase().split(' ');
      // For each search key, if nothing from the text or the title match,
      // reject this guess.
      return lowerSearchKeys.every((key) => {
        return guessText.indexOf(key) !== -1 || titleWords.some((word) => word.startsWith(key));
      });
    };
  }, [tracker.puzzles]);

  const filteredGuesses = useCallback((guesses: GuessType[]) => {
    const searchKeys = getSearchString().split(' ');
    let interestingGuesses;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      interestingGuesses = guesses;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingGuesses = guesses.filter(isInteresting);
    }

    return interestingGuesses;
  }, [getSearchString, compileMatcher]);

  const hunt = tracker.hunt;

  if (!tracker.ready || !hunt) {
    return <div>loading...</div>;
  }

  const guesses = filteredGuesses(tracker.guesses);

  return (
    <div>
      <h1>Guess queue</h1>
      <FormGroup>
        <InputGroup>
          <FormControl
            id="jr-guess-search"
            as="input"
            type="text"
            ref={searchBarRef}
            placeholder="Filter by title or answer"
            value={getSearchString()}
            onChange={onSearchStringChange}
          />
          <InputGroup.Append>
            <Button variant="secondary" onClick={clearSearch}>
              <FontAwesomeIcon icon={faEraser} />
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </FormGroup>
      {guesses.map((guess) => {
        return (
          <GuessBlock
            key={guess._id}
            hunt={hunt}
            guess={guess}
            createdByDisplayName={tracker.displayNames[guess.createdBy]}
            puzzle={tracker.puzzles[guess.puzzle]}
            canEdit={tracker.canEdit}
          />
        );
      })}
    </div>
  );
};

export default GuessQueuePage;
