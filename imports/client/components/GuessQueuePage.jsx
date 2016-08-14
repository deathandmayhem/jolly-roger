import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import React from 'react';
import { Link } from 'react-router';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
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
    profile: React.PropTypes.shape(Schemas.Profiles.asReactPropTypes()).isRequired,
    puzzle: React.PropTypes.shape(Schemas.Puzzles.asReactPropTypes()).isRequired,
  },

  styles: {
    backgrounds: {
      pending: {
        backgroundColor: '#f0f0ff',
      },
      correct: {
        backgroundColor: '#f0fff0',
      },
      incorrect: {
        backgroundColor: '#fff0f0',
      },
      rejected: {
        backgroundColor: '#f0f0f0',
      },
    },
    layout: {
      marginBottom: '8px',
      display: 'flex',
      flexDirection: 'row',
    },
    buttonGroup: {
      flex: '1 1 50%',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-begin',
      justifyContent: 'space-between',
      padding: '8px',
    },
    buttons: {
      pending: {
        flex: '0 1 20%',
        backgroundColor: '#f0f0ff',
        border: '1px solid #0000ff',
        borderRadius: '5px',
      },
      correct: {
        flex: '0 1 20%',
        backgroundColor: '#f0fff0',
        border: '1px solid #00ff00',
        borderRadius: '5px',
      },
      incorrect: {
        flex: '0 1 20%',
        backgroundColor: '#fff0f0',
        border: '1px solid #ff0000',
        borderRadius: '5px',
      },
      rejected: {
        flex: '0 1 20%',
        backgroundColor: '#f0f0f0',
        border: '1px solid #000000',
        borderRadius: '5px',
      },
    },
    guessInfo: {
      flex: '1 1 50%',
    },
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
    const style = _.extend(
      {},
      this.styles.layout,
      this.styles.backgrounds[guess.state],
    );
    const timestamp = this.formatDate(guess.createdAt);
    return (
      <div style={style}>
        <div style={this.styles.guessInfo}>
          <div>{timestamp} from {this.props.profile.displayName || '<no name given>'}</div>
          <div>Puzzle: <a href={this.props.puzzle.url} target="_blank" rel="noopener noreferrer">{this.props.puzzle.title}</a> (<Link to={`/hunts/${this.props.puzzle.hunt}/puzzles/${this.props.puzzle._id}`}>discussion</Link>)</div>
          <div><AutoSelectInput value={guess.guess} /></div>
        </div>
        {this.props.canEdit
            ?
          <div style={this.styles.buttonGroup}>
            {guess.state === 'correct' ? <button style={{ flex: '0 1 20%', border: '0px', backgroundColor: 'transparent' }} disabled>Correct</button> : <button style={this.styles.buttons.correct} onClick={this.markCorrect}>Mark correct</button>}
            {guess.state === 'incorrect' ? <button style={{ flex: '0 1 20%', border: '0px', backgroundColor: 'transparent' }} disabled>Incorrect</button> : <button style={this.styles.buttons.incorrect} onClick={this.markIncorrect}>Mark incorrect</button>}
            {guess.state === 'pending' ? <button style={{ flex: '0 1 20%', border: '0px', backgroundColor: 'transparent' }} disabled>Pending</button> : <button style={this.styles.buttons.pending} onClick={this.markPending}>Mark pending</button>}
            {guess.state === 'rejected' ? <button style={{ flex: '0 1 20%', border: '0px', backgroundColor: 'transparent' }} disabled>Rejected</button> : <button style={this.styles.buttons.rejected} onClick={this.markRejected}>Mark rejected</button>}
          </div>
            :
          <div style={this.styles.buttonGroup}>
            {guess.state}
          </div>
        }
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
  },

  mixins: [ReactMeteorData],

  getMeteorData() {
    const guessesHandle = this.context.subs.subscribe('mongo.guesses', {
      hunt: this.props.params.huntId,
    });
    const puzzlesHandle = this.context.subs.subscribe('mongo.puzzles', {
      hunt: this.props.params.huntId,
    });
    const profilesHandle = this.context.subs.subscribe('mongo.profiles');
    const ready = guessesHandle.ready() && puzzlesHandle.ready() && profilesHandle.ready();
    const guesses = ready ? Models.Guesses.find({ hunt: this.props.params.huntId }, { sort: { createdAt: -1 } }).fetch() : [];
    const puzzles = ready ? _.indexBy(Models.Puzzles.find({ hunt: this.props.params.huntId }).fetch(), '_id') : [];
    const profiles = ready ? _.indexBy(Models.Profiles.find().fetch(), '_id') : [];
    const canEdit = Roles.userHasPermission(Meteor.userId(), 'mongo.guesses.update');
    return {
      ready,
      guesses,
      puzzles,
      profiles,
      canEdit,
    };
  },

  render() {
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
              profile={this.data.profiles[guess.createdBy]}
              puzzle={this.data.puzzles[guess.puzzle]}
              canEdit={this.data.canEdit}
            />
          );
        })}
      </div>
    );
  },
});

export { GuessQueuePage };
