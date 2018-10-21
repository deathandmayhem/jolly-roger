import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import PropTypes from 'prop-types';
import React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';
import { withTracker } from 'meteor/react-meteor-data';
import subsCache from '../subsCache.js';
import navAggregatorType from './navAggregatorType.jsx';

/* eslint-disable max-len */

const AutoSelectInput = React.createClass({
  propTypes: {
    value: PropTypes.string.isRequired,
  },

  onFocus() {
    // Use the selection API to select the contents of this, for easier clipboarding.
    this.inputNode.select();
  },

  render() {
    return (
      <input
        ref={(node) => { this.inputNode = node; }}
        readOnly
        value={this.props.value}
        onFocus={this.onFocus}
      />
    );
  },
});

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GuessBlock = React.createClass({
  propTypes: {
    canEdit: PropTypes.bool.isRequired,
    guess: PropTypes.shape(Schemas.Guesses.asReactPropTypes()).isRequired,
    createdByDisplayName: PropTypes.string.isRequired,
    puzzle: PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
  },

  markPending() {
    Meteor.call('markGuessPending', this.props.guess._id);
  },

  markCorrect() {
    Meteor.call('markGuessCorrect', this.props.guess._id);
  },

  markIncorrect() {
    Meteor.call('markGuessIncorrect', this.props.guess._id);
  },

  markRejected() {
    Meteor.call('markGuessRejected', this.props.guess._id);
  },


  formatDate(date) {
    // We only care about days in so far as which day of hunt this guess was submitted on
    const day = daysOfWeek[date.getDay()];
    return `${date.toLocaleTimeString()} on ${day}`;
  },

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
            {this.props.createdByDisplayName || '<no name given>'}
          </div>
          <div>
            {'Puzzle: '}
            <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a>
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
  },
});

const GuessQueuePage = React.createClass({
  propTypes: {
    params: PropTypes.shape({
      huntId: PropTypes.string.isRequired,
    }).isRequired,
    ready: PropTypes.bool.isRequired,
    guesses: PropTypes.arrayOf(PropTypes.shape(Schemas.Guesses.asReactPropTypes())).isRequired,
    puzzles: PropTypes.objectOf(PropTypes.shape(Schemas.Puzzles.asReactPropTypes())).isRequired,
    displayNames: PropTypes.objectOf(PropTypes.string).isRequired,
    canEdit: PropTypes.bool.isRequired,
  },

  contextTypes: {
    navAggregator: navAggregatorType,
  },

  renderPage() {
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
              guess={guess}
              createdByDisplayName={this.props.displayNames[guess.createdBy]}
              puzzle={this.props.puzzles[guess.puzzle]}
              canEdit={this.props.canEdit}
            />
          );
        })}
      </div>
    );
  },

  render() {
    return (
      <this.context.navAggregator.NavItem
        itemKey="guessqueue"
        to={`/hunts/${this.props.params.huntId}/announcements`}
        label="Guess queue"
      >
        {this.renderPage()}
      </this.context.navAggregator.NavItem>
    );
  },
});

const GuessQueuePageContainer = withTracker(({ params }) => {
  const guessesHandle = subsCache.subscribe('mongo.guesses', {
    hunt: params.huntId,
  });
  const puzzlesHandle = subsCache.subscribe('mongo.puzzles', {
    hunt: params.huntId,
  });
  const displayNamesHandle = Models.Profiles.subscribeDisplayNames(subsCache);
  const ready = guessesHandle.ready() && puzzlesHandle.ready() && displayNamesHandle.ready();
  const guesses = ready ? Models.Guesses.find({ hunt: params.huntId }, { sort: { createdAt: -1 } }).fetch() : [];
  const puzzles = ready ? _.indexBy(Models.Puzzles.find({ hunt: params.huntId }).fetch(), '_id') : {};
  let displayNames = {};
  if (ready) {
    displayNames = Models.Profiles.displayNames();
  }

  const canEdit = Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update');
  return {
    ready,
    guesses,
    puzzles,
    displayNames,
    canEdit,
  };
})(GuessQueuePage);

GuessQueuePageContainer.propTypes = {
  params: PropTypes.shape({
    huntId: PropTypes.string.isRequired,
  }).isRequired,
};

export default GuessQueuePageContainer;
