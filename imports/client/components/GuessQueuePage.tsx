import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Roles } from 'meteor/nicolaslopezj:roles';
import PropTypes from 'prop-types';
import React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import GuessesSchema, { GuessType } from '../../lib/schemas/guess';
import HuntsSchema, { HuntType } from '../../lib/schemas/hunts';
import PuzzlesSchema, { PuzzleType } from '../../lib/schemas/puzzles';
import Guesses from '../../lib/models/guess';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { guessURL } from '../../model-helpers';

/* eslint-disable max-len */

interface AutoSelectInputProps {
  value: string;
}

class AutoSelectInput extends React.Component<AutoSelectInputProps> {
  static propTypes = {
    value: PropTypes.string.isRequired,
  };

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

  private inputRef: React.RefObject<HTMLInputElement>

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
  static propTypes = {
    canEdit: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes<HuntType>()).isRequired as React.Validator<HuntType>,
    guess: PropTypes.shape(GuessesSchema.asReactPropTypes<GuessType>()).isRequired as React.Validator<GuessType>,
    createdByDisplayName: PropTypes.string.isRequired,
    puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes<PuzzleType>()).isRequired as React.Validator<PuzzleType>,
  };

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
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes<HuntType>()) as React.Requireable<HuntType>,
    guesses: PropTypes.arrayOf(
      PropTypes.shape(GuessesSchema.asReactPropTypes<GuessType>()).isRequired as React.Validator<GuessType>
    ).isRequired,
    puzzles: PropTypes.objectOf(
      PropTypes.shape(PuzzlesSchema.asReactPropTypes<PuzzleType>()).isRequired as React.Validator<PuzzleType>
    ).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
    canEdit: PropTypes.bool.isRequired,
  };

  render() {
    const hunt = this.props.hunt;

    if (!this.props.ready || !hunt) {
      return <div>loading...</div>;
    }

    return (
      <div>
        <h1>Guess queue</h1>
        {this.props.guesses.map((guess) => {
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
  const huntHandle = subsCache.subscribe('mongo.hunts', {
    _id: params.huntId,
  });
  const guessesHandle = subsCache.subscribe('mongo.guesses', {
    hunt: params.huntId,
  });
  const puzzlesHandle = subsCache.subscribe('mongo.puzzles', {
    hunt: params.huntId,
  });
  const displayNamesHandle = Profiles.subscribeDisplayNames(subsCache);
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
