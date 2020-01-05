import { Meteor, Subscription } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import { GuessType } from '../lib/schemas/guess';
import ChatMessages from '../lib/models/chats';
import Guesses from '../lib/models/guess';
import Hunts from '../lib/models/hunts';
import Profiles from '../lib/models/profiles';
import Puzzles from '../lib/models/puzzles';
import GlobalHooks from './global-hooks';

function guessPublishFunc(filter: Mongo.Selector<GuessType>):
  (this: Subscription) => Mongo.Cursor<any> | Mongo.Cursor<any>[] | undefined {
  return function () {
    const u = Meteor.users.findOne(this.userId);
    if (!u) {
      throw new Meteor.Error(401, 'Unauthenticated');
    }

    const guesses = Guesses.find({ ...filter, hunt: { $in: u.hunts } });
    const huntIds = [...new Set(guesses.map(g => g.hunt))];
    const puzzleIds = [...new Set(guesses.map(g => g.puzzle))];
    const guesserIds = [...new Set(guesses.map(g => g.createdBy))];

    const hunts = Hunts.find({ _id: { $in: huntIds } });
    const puzzles = Puzzles.find({ _id: { $in: puzzleIds } });
    const guessers = Profiles.find({ _id: { $in: guesserIds } }, { fields: { displayName: 1 } });

    return [guesses, hunts, puzzles, guessers];
  };
}

Meteor.publish('guesses.all', guessPublishFunc({}));
Meteor.publish('guesses.pending', guessPublishFunc({ state: 'pending' }));

function addChatMessage(guess: GuessType, newState: GuessType['state']): void {
  const message = `Guess ${guess.guess} was marked ${newState}`;
  const puzzle = Puzzles.findOne(guess.puzzle)!;
  ChatMessages.insert({
    hunt: puzzle.hunt,
    puzzle: guess.puzzle,
    text: message,
    timestamp: new Date(),
  });
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
      $set: {
        answer: guess.guess,
      },
    });
    GlobalHooks.runPuzzleSolvedHooks(guess.puzzle);
  } else if (guess.state === 'correct') {
    // Transitioning from correct -> something else: un-mark that puzzle as solved.
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $unset: {
        answer: 1,
      },
    });
    GlobalHooks.runPuzzleNoLongerSolvedHooks(guess.puzzle);
  }
}

Meteor.methods({
  addGuessForPuzzle(puzzleId: string, guess: string, direction: number, confidence: number) {
    check(this.userId, String);
    check(puzzleId, String);
    check(guess, String);
    check(direction, Number);
    check(confidence, Number);

    const puzzle = Puzzles.findOne(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, 'No such puzzle');
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

  markGuessPending(guessId: string) {
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

  markGuessCorrect(guessId: string) {
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

  markGuessIncorrect(guessId: string) {
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

  markGuessRejected(guessId: string) {
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
