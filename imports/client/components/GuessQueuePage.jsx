import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
import { ReactMeteorData } from 'meteor/react-meteor-data';

/* eslint-disable max-len */

const AutoSelectInput = React.createClass({
  propTypes: {
    value: React.PropTypes.string.isRequired,
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

const GuessBlock = React.createClass({
  propTypes: {
    canEdit: React.PropTypes.bool.isRequired,
    guess: React.PropTypes.shape(Schemas.Guesses.asReactPropTypes()).isRequired,
    createdByDisplayName: React.PropTypes.string.isRequired,
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
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

  daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  formatDate(date) {
    // We only care about days in so far as which day of hunt this guess was submitted on
    const day = this.daysOfWeek[date.getDay()];
    return `${date.toLocaleTimeString()} on ${day}`;
  },

  render() {
    const guess = this.props.guess;
    const timestamp = this.formatDate(guess.createdAt);
    const guessButtons = (
      <div className="guess-button-group">
        {guess.state === 'correct' ? <button className="guess-button guess-button-disabled" disabled>Correct</button> : <button className="guess-button guess-button-correct" onClick={this.markCorrect}>Mark correct</button>}
        {guess.state === 'incorrect' ? <button className="guess-button guess-button-disabled" disabled>Incorrect</button> : <button className="guess-button guess-button-incorrect" onClick={this.markIncorrect}>Mark incorrect</button>}
        {guess.state === 'pending' ? <button className="guess-button guess-button-disabled" disabled>Pending</button> : <button className="guess-button guess-button-pending" onClick={this.markPending}>Mark pending</button>}
        {guess.state === 'rejected' ? <button className="guess-button guess-button-disabled" disabled>Rejected</button> : <button className="guess-button guess-button-rejected" onClick={this.markRejected}>Mark rejected</button>}
      </div>
    );

    return (
      <div className={classnames('guess', `guess-${guess.state}`)}>
        <div className="guess-info">
          <div>{timestamp} from {this.props.createdByDisplayName || '<no name given>'}</div>
          <div>Puzzle: <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a> (<Link to={`/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`}>discussion</Link>)</div>
          <div>Solve direction: {guess.direction}</div>
          <div>Confidence: {guess.confidence}</div>
          <div><AutoSelectInput value={guess.guess} /></div>
        </div>
        {this.props.canEdit ? guessButtons : <div className="guess-button-group">{guess.state}</div>}
      </div>
    );
  },
});

const GuessQueuePage = React.createClass({
  propTypes: {
    params: React.PropTypes.shape({
      huntId: React.PropTypes.string.isRequired,
    }).isRequired,
  },

  contextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const guessesHandle = this.context.subs.subscribe('mongo.guesses', {
      hunt: this.props.params.huntId,
    });
    const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', {
      hunt: this.props.params.huntId,
    });
    const displayNamesHandle = Models.Profiles.subscribeDisplayNames(this.context.subs);
    const ready = guessesHandle.ready() && puzzlesHandle.ready() && displayNamesHandle.ready();
    const guesses = ready ? Models.Guesses.find({ hunt: this.props.params.huntId }, { sort: { createdAt: -1 } }).fetch() : [];
    const puzzles = ready ? _.indexBy(Models.Puzzles.find({ hunt: this.props.params.huntId }).fetch(), '_id') : {};
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
  },

  renderPage() {
    if (!this.data.ready) {
      return <div>loading...</div>;
    }

    return (
      <div>
        <h1>Guess queue</h1>
        {this.data.guesses.map((guess) => {
          return (
            <GuessBlock
              key={guess._id}
              guess={guess}
              createdByDisplayName={this.data.displayNames[guess.createdBy]}
              puzzle={this.data.puzzles[guess.puzzle]}
              canEdit={this.data.canEdit}
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

export { GuessQueuePage };
