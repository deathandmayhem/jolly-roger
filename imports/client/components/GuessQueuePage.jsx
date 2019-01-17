import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';
import { withTracker } from 'meteor/react-meteor-data';
import { withBreadcrumb } from 'react-breadcrumbs-context';
import subsCache from '../subsCache';
import GuessesSchema from '../../lib/schemas/guess';
import HuntsSchema from '../../lib/schemas/hunts';
import PuzzlesSchema from '../../lib/schemas/puzzles';
import Guesses from '../../lib/models/guess';
import Hunts from '../../lib/models/hunts';
import Profiles from '../../lib/models/profiles';
import Puzzles from '../../lib/models/puzzles';
import { guessURL } from '../../model-helpers';

/* eslint-disable max-len */

class AutoSelectInput extends React.Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
  }

  onFocus = () => {
    // Use the selection API to select the contents of this, for easier clipboarding.
    this.inputRef.current.select();
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

class GuessBlock extends React.Component {
  static propTypes = {
    canEdit: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()).isRequired,
    guess: PropTypes.shape(GuessesSchema.asReactPropTypes()).isRequired,
    createdByDisplayName: PropTypes.string.isRequired,
    puzzle: PropTypes.shape(PuzzlesSchema.asReactPropTypes()).isRequired,
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

  formatDate = (date) => {
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

class GuessQueuePage extends React.Component {
  static propTypes = {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    hunt: PropTypes.shape(HuntsSchema.asReactPropTypes()),
    guesses: PropTypes.arrayOf(PropTypes.shape(GuessesSchema.asReactPropTypes())).isRequired,
    puzzles: PropTypes.objectOf(PropTypes.shape(PuzzlesSchema.asReactPropTypes())).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string).isRequired,
    canEdit: PropTypes.bool.isRequired,
  };

  render() {
    if (!this.props.ready) {
      return <div>loading...</div>;
    }

    return (
      <div>
        <h1>Guess queue</h1>
        {this.props.guesses.map((guess) => {
          return (
            <GuessBlock
              key={guess._id}
              hunt={this.props.hunt}
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

const crumb = withBreadcrumb(({ params }) => {
  return { title: 'Guess queue', link: `/hunts/${params.huntId}/guesses` };
});
const tracker = withTracker(({ params }) => {
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
  const hunt = ready ? Hunts.findOne({ _id: params.huntId }) : undefined;
  const guesses = ready ? Guesses.find({ hunt: params.huntId }, { sort: { createdAt: -1 } }).fetch() : [];
  const puzzles = ready ? _.indexBy(Puzzles.find({ hunt: params.huntId }).fetch(), '_id') : {};
  let displayNames = {};
  if (ready) {
    displayNames = Profiles.displayNames();
  }

  const canEdit = Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update');
  return {
    ready,
    hunt,
    guesses,
    puzzles,
    displayNames,
    canEdit,
  };
});

const GuessQueuePageContainer = _.compose(crumb, tracker)(GuessQueuePage);
GuessQueuePageContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default GuessQueuePageContainer;
