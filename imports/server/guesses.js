import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '../ansible.js';
import ChatMessages from '../lib/models/chats.js';
import Guesses from '../lib/models/guess.js';
import Puzzles from '../lib/models/puzzles.js';

function addChatMessage(guess, newState) {
  const message = `Guess ${guess.guess} was marked ${newState}`;
  const puzzle = Puzzles.findOne(guess.puzzle);
  ChatMessages.insert({
    hunt: puzzle.hunt,
    puzzle: guess.puzzle,
    text: message,
    timestamp: new Date(),
  });
}

function transitionGuess(guess, newState) {
  if (newState === guess.state) return;

  Guesses.update({
    _id: guess._id,
  }, {
    $set: {
      state: newState,
    },
  });
  addChatMessage(guess, newState);

  if (newState === 'correct') {
    // Mark this puzzle as solved.
    // TODO: run custom hook logic (e.g. archive Slack channel, etc.)
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $set: {
        answer: guess.guess,
      },
    });
    globalHooks.runPuzzleSolvedHooks(guess.puzzle);
  } else if (guess.state === 'correct') {
    // Transitioning from correct -> something else: un-mark that puzzle as solved.
    // TODO: run custom hook login (e.g. unarchive Slack channel, etc.)
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $unset: {
        answer: '',
      },
    });
    globalHooks.runPuzzleNoLongerSolvedHooks(guess.puzzle);
  }
}

Meteor.methods({
  addGuessForPuzzle(puzzleId, guess, direction, confidence) {
    check(this.userId, String);
    check(puzzleId, String);
    check(guess, String);
    check(direction, Number);
    check(confidence, Number);

    const puzzle = Puzzles.findOne(puzzleId);

    Ansible.log('New guess', {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      user: this.userId,
      guess,
      direction,
      confidence,
    });
    Guesses.insert({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess,
      direction,
      confidence,
      state: 'pending',
    });
  },

  markGuessPending(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'pending' });
    transitionGuess(guess, 'pending');
  },

  markGuessCorrect(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'correct' });
    transitionGuess(guess, 'correct');
  },

  markGuessIncorrect(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'incorrect' });
    transitionGuess(guess, 'incorrect');
  },

  markGuessRejected(guessId) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'rejected' });
    transitionGuess(guess, 'rejected');
  },
});
