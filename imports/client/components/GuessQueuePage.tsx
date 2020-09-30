import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { withTracker } from 'meteor/react-meteor-data';
import { _ } from 'meteor/underscore';
import classnames from 'classnames';
import { Location } from 'history';
import React from 'react';
import Button from 'react-bootstrap/Button';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import FormGroup from 'react-bootstrap/FormGroup';
import InputGroup from 'react-bootstrap/InputGroup';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import { Link, browserHistory } from 'react-router';
import Guesses from '../../lib/models/guess';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { GuessType } from '../../lib/schemas/guess';
import { HuntType } from '../../lib/schemas/hunts';
import { PuzzleType } from '../../lib/schemas/puzzles';
import { guessURL } from '../../model-helpers';

/* eslint-disable max-len */

interface AutoSelectInputProps {
  value: string;
}

class AutoSelectInput extends React.Component<AutoSelectInputProps> {
  private inputRef: React.RefObject<HTMLInputElement>

  constructor(props: AutoSelectInputProps) {
    super(props);
    this.inputRef = React.createRef();
  }

  onFocus = () => {
    // Use the selection API to select the contents of this, for easier clipboarding.
    if (this.inputRef.current) {
      this.inputRef.current.select();
    }
  };

  render() {
    return (
      <input
        ref={this.inputRef}
        readOnly
        value={this.props.value}
        onFocus={this.onFocus}
      />
    );
  }
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface GuessBlockProps {
  canEdit: boolean;
  hunt: HuntType;
  guess: GuessType;
  createdByDisplayName: string;
  puzzle: PuzzleType;
}

class GuessBlock extends React.Component<GuessBlockProps> {
  markPending = () => {
    Meteor.call('markGuessPending', this.props.guess._id);
  };

  markCorrect = () => {
    Meteor.call('markGuessCorrect', this.props.guess._id);
  };

  markIncorrect = () => {
    Meteor.call('markGuessIncorrect', this.props.guess._id);
  };

  markRejected = () => {
    Meteor.call('markGuessRejected', this.props.guess._id);
  };

  formatDate = (date: Date) => {
    // We only care about days in so far as which day of hunt this guess was submitted on
    const day = daysOfWeek[date.getDay()];
    return `${date.toLocaleTimeString()} on ${day}`;
  };

  render() {
    const guess = this.props.guess;
    const timestamp = this.formatDate(guess.createdAt);
    const guessButtons = (
      <div className="guess-button-group">
        {guess.state === 'correct' ? <button type="button" className="guess-button guess-button-disabled" disabled>Correct</button> : <button type="button" className="guess-button guess-button-correct" onClick={this.markCorrect}>Mark correct</button>}
        {guess.state === 'incorrect' ? <button type="button" className="guess-button guess-button-disabled" disabled>Incorrect</button> : <button type="button" className="guess-button guess-button-incorrect" onClick={this.markIncorrect}>Mark incorrect</button>}
        {guess.state === 'rejected' ? <button type="button" className="guess-button guess-button-disabled" disabled>Rejected</button> : <button type="button" className="guess-button guess-button-rejected" onClick={this.markRejected}>Mark rejected</button>}
        {guess.state === 'pending' ? <button type="button" className="guess-button guess-button-disabled" disabled>Pending</button> : <button type="button" className="guess-button guess-button-pending" onClick={this.markPending}>Mark pending</button>}
      </div>
    );

    return (
      <div className={classnames('guess', `guess-${guess.state}`)}>
        <div className="guess-info">
          <div>
            {timestamp}
            {' from '}
            <span className="breakable">{this.props.createdByDisplayName || '<no name given>'}</span>
          </div>
          <div>
            {'Puzzle: '}
            <a href={guessURL(this.props.hunt, this.props.puzzle)} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a>
            {' ('}
            <Link to={`/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`}>discussion</Link>
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
        </div>
        {this.props.canEdit ? guessButtons : <div className="guess-button-group">{guess.state}</div>}
      </div>
    );
  }
}

interface GuessQueuePageParams {
  params: {huntId: string};
  // eslint-disable-next-line no-restricted-globals
  location: Location;
}

type GuessQueuePageProps = GuessQueuePageParams & {
  ready: boolean;
  hunt?: HuntType;
  guesses: GuessType[];
  puzzles: Record<string, PuzzleType>;
  displayNames: Record<string, string>;
  canEdit: boolean;
};

class GuessQueuePage extends React.Component<GuessQueuePageProps> {
  onSearchStringChange: FormControlProps['onChange'] = (e) => {
    this.setSearchString(e.currentTarget.value);
  };

  getSearchString = (): string => {
    const q = this.props.location.query.q;
    return (Array.isArray(q) ? q[0] : q) || '';
  };

  setSearchString = (val: string) => {
    const newQuery = val ? { q: val } : { q: undefined };
    browserHistory.replace({
      pathname: this.props.location.pathname,
      query: { ...this.props.location.query, ...newQuery },
    });
  };

  clearSearch = () => {
    this.setSearchString('');
  }

  compileMatcher = (searchKeys: string[]): (g: GuessType) => boolean => {
    // Given a list a search keys, compileMatcher returns a function that,
    // given a guess, returns true if all search keys match that guess in
    // some way, and false if any of the search keys cannot be found in
    // either the guess or the puzzle title.
    const lowerSearchKeys = searchKeys.map((key) => key.toLowerCase());
    return (guess) => {
      const puzzle = this.props.puzzles[guess.puzzle];
      const guessText = guess.guess.toLowerCase();

      const titleWords = puzzle.title.toLowerCase().split(' ');
      // For each search key, if nothing from the text or the title match,
      // reject this guess.
      return lowerSearchKeys.every((key) => {
        return guessText.indexOf(key) !== -1 || titleWords.some((word) => word.startsWith(key));
      });
    };
  };

  filteredGuesses = (guesses: GuessType[]) => {
    const searchKeys = this.getSearchString().split(' ');
    let interestingGuesses;

    if (searchKeys.length === 1 && searchKeys[0] === '') {
      interestingGuesses = guesses;
    } else {
      const searchKeysWithEmptyKeysRemoved = searchKeys.filter((key) => { return key.length > 0; });
      const isInteresting = this.compileMatcher(searchKeysWithEmptyKeysRemoved);
      interestingGuesses = guesses.filter(isInteresting);
    }

    return interestingGuesses;
  }

  render() {
    const hunt = this.props.hunt;

    if (!this.props.ready || !hunt) {
      return <div>loading...</div>;
    }

    const guesses = this.filteredGuesses(this.props.guesses);

    return (
      <div>
        <h1>Guess queue</h1>
        <FormGroup>
          <InputGroup>
            <FormControl
              id="jr-guess-search"
              as="input"
              type="text"
              placeholder="Filter by title or answer"
              value={this.getSearchString()}
              onChange={this.onSearchStringChange}
            />
            <InputGroup.Append>
              <Button variant="secondary" onClick={this.clearSearch}>
                Clear
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
              createdByDisplayName={this.props.displayNames[guess.createdBy]}
              puzzle={this.props.puzzles[guess.puzzle]}
              canEdit={this.props.canEdit}
            />
          );
        })}
      </div>
    );
  }
}

const crumb = withBreadcrumb(({ params }: GuessQueuePageParams) => {
  return { title: 'Guess queue', path: `/hunts/${params.huntId}/guesses` };
});
const tracker = withTracker(({ params }: GuessQueuePageParams) => {
  const huntHandle = Meteor.subscribe('mongo.hunts', {
    _id: params.huntId,
  });
  const guessesHandle = Meteor.subscribe('mongo.guesses', {
    hunt: params.huntId,
  });
  const puzzlesHandle = Meteor.subscribe('mongo.puzzles', {
    hunt: params.huntId,
  });
  const displayNamesHandle = Profiles.subscribeDisplayNames();
  const ready = huntHandle.ready() && guessesHandle.ready() && puzzlesHandle.ready() && displayNamesHandle.ready();
  const data: Pick<GuessQueuePageProps, Exclude<keyof GuessQueuePageProps, keyof GuessQueuePageParams>> = {
    ready,
    guesses: [],
    puzzles: {},
    displayNames: {},
    canEdit: Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update'),
  };
  if (ready) {
    data.hunt = Hunts.findOne({ _id: params.huntId });
    data.guesses = Guesses.find({ hunt: params.huntId }, { sort: { createdAt: -1 } }).fetch();
    data.puzzles = _.indexBy(Puzzles.find({ hunt: params.huntId }).fetch(), '_id');
    data.displayNames = Profiles.displayNames();
  }

  return data;
});

const GuessQueuePageContainer = crumb(tracker(GuessQueuePage));

export default GuessQueuePageContainer;
