import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import Guesses from '../lib/models/guess';
import Hunts from '../lib/models/hunts';
import Puzzles from '../lib/models/puzzles';
import { GuessType } from '../lib/schemas/guess';
import { sendChatMessage } from './chat';
import GlobalHooks from './global-hooks';

function addChatMessage(guess: GuessType, newState: GuessType['state']): void {
  const message = `Guess ${guess.guess} was marked ${newState}`;
  sendChatMessage(guess.puzzle, message, undefined);
}

function transitionGuess(guess: GuessType, newState: GuessType['state']) {
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
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $addToSet: {
        answers: guess.guess,
      },
    });
    GlobalHooks.runPuzzleSolvedHooks(guess.puzzle);
  } else if (guess.state === 'correct') {
    // Transitioning from correct -> something else: un-mark that puzzle as solved.
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $pull: {
        answers: guess.guess,
      },
    });
    GlobalHooks.runPuzzleNoLongerSolvedHooks(guess.puzzle);
  }
}

Meteor.methods({
  addGuessForPuzzle(puzzleId: unknown, guess: unknown, direction: unknown, confidence: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(guess, String);
    check(direction, Number);
    check(confidence, Number);

    const puzzle = Puzzles.findOne(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, 'No such puzzle');
    }

    const hunt = Hunts.findOne(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, 'No such hunt');
    }

    if (!hunt.hasGuessQueue) {
      throw new Meteor.Error(404, 'Hunt does not allow you to submit guesses, only answers');
    }

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

  addCorrectGuessForPuzzle(puzzleId: unknown, answer: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(answer, String);

    const puzzle = Puzzles.findOne(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, 'No such puzzle');
    }

    const hunt = Hunts.findOne(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, 'No such hunt');
    }

    if (hunt.hasGuessQueue) {
      throw new Meteor.Error(404, 'Hunt does not allow you to enter answers directly');
    }

    Ansible.log('New correct guess', {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      user: this.userId,
      guess: answer,
    });
    const answerId = Guesses.insert({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess: answer,
      state: 'correct',
    });

    const savedAnswer = Guesses.findOne(answerId);
    if (!savedAnswer) {
      throw new Meteor.Error(404, 'No such correct guess');
    }
    addChatMessage(savedAnswer, 'correct');
    Puzzles.update({
      _id: savedAnswer.puzzle,
    }, {
      $addToSet: {
        answers: savedAnswer.guess,
      },
    });
    GlobalHooks.runPuzzleSolvedHooks(savedAnswer.puzzle);
  },

  removeAnswerFromPuzzle(puzzleId: unknown, guessId: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(guessId, String);

    const puzzle = Puzzles.findOne({
      _id: puzzleId,
    }, {
      fields: {
        hunt: 1,
      },
    });
    const huntId = puzzle && puzzle.hunt;
    const hunt = Hunts.findOne({ _id: huntId });
    if (!huntId || !hunt || hunt.hasGuessQueue) {
      throw new Error(`Hunt ${huntId} does not support self-service answers`);
    }

    const guess = Guesses.findOne({ puzzle: puzzleId, _id: guessId });
    if (!guess) return;
    transitionGuess(guess, 'incorrect');
  },

  markGuessPending(guessId: unknown) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'pending' });
    transitionGuess(guess, 'pending');
  },

  markGuessCorrect(guessId: unknown) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'correct' });
    transitionGuess(guess, 'correct');
  },

  markGuessIncorrect(guessId: unknown) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'incorrect' });
    transitionGuess(guess, 'incorrect');
  },

  markGuessRejected(guessId: unknown) {
    check(guessId, String);
    Roles.checkPermission(this.userId, 'mongo.guesses.update');
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    Ansible.log('Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'rejected' });
    transitionGuess(guess, 'rejected');
  },
});
