import { check } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Ansible from '../ansible';
import Guesses from '../lib/models/guesses';
import Hunts from '../lib/models/hunts';
import MeteorUsers from '../lib/models/meteor_users';
import Profiles from '../lib/models/profiles';
import Puzzles from '../lib/models/puzzles';
import { userMayUpdateGuessesForHunt, deprecatedIsOperator } from '../lib/permission_stubs';
import { GuessType } from '../lib/schemas/guess';
import { HuntType } from '../lib/schemas/hunt';
import { PuzzleType } from '../lib/schemas/puzzle';
import { sendChatMessage } from './chat';
import GlobalHooks from './global-hooks';
import RefCountedObserverMap from './refcounted-observer-map';

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

function checkMayUpdateGuess(userId: string | null | undefined, huntId: string) {
  if (!userMayUpdateGuessesForHunt(userId, huntId)) {
    throw new Meteor.Error(401, 'Must be permitted to update guesses');
  }
}

class PendingGuessWatcher {
  sub: Subscription;

  guessCursor: Mongo.Cursor<GuessType>;

  guessWatch: Meteor.LiveQueryHandle;

  guesses: Record<string, GuessType>;

  huntRefCounter: RefCountedObserverMap<HuntType>;

  puzzleRefCounter: RefCountedObserverMap<PuzzleType>;

  constructor(sub: Subscription) {
    this.sub = sub;

    const user = MeteorUsers.findOne(sub.userId!)!;

    this.guessCursor = Guesses.find({ state: 'pending', hunt: { $in: user.hunts } });
    this.guesses = {};
    this.huntRefCounter = new RefCountedObserverMap(sub, Hunts);
    this.puzzleRefCounter = new RefCountedObserverMap(sub, Puzzles);

    this.guessWatch = this.guessCursor.observeChanges({
      added: (id, fields) => {
        this.guesses[id] = { _id: id, ...fields } as GuessType;
        this.huntRefCounter.incref(fields.hunt!);
        this.puzzleRefCounter.incref(fields.puzzle!);
        this.sub.added(Guesses.tableName, id, fields);
      },

      changed: (id, fields) => {
        const huntUpdated = Object.prototype.hasOwnProperty.call(fields, 'hunt');
        const puzzleUpdated = Object.prototype.hasOwnProperty.call(fields, 'puzzle');

        // The order of operations here is important to avoid transient
        // inconsistencies
        if (huntUpdated) {
          this.huntRefCounter.incref(fields.hunt!);
        }
        if (puzzleUpdated) {
          this.puzzleRefCounter.incref(fields.puzzle!);
        }
        this.sub.changed(Guesses.tableName, id, fields);
        if (puzzleUpdated) {
          this.puzzleRefCounter.decref(this.guesses[id].puzzle);
        }
        if (huntUpdated) {
          this.huntRefCounter.decref(this.guesses[id].hunt);
        }

        this.guesses[id] = { ...this.guesses[id], ...fields };
      },

      removed: (id) => {
        this.sub.removed(Guesses.tableName, id);
        this.huntRefCounter.decref(this.guesses[id].hunt);
        this.puzzleRefCounter.decref(this.guesses[id].puzzle);
        delete this.guesses[id];
      },
    });

    this.sub.ready();
  }

  shutdown() {
    this.guessWatch.stop();
  }
}

// Publish pending guesses enriched with puzzle and hunt. This is a dedicated
// publish because every operator needs this information for the notification
// center, and without assistance they need an overly broad subscription to the
// related collections
Meteor.publish('pendingGuesses', function () {
  check(this.userId, String);

  if (!deprecatedIsOperator(this.userId)) {
    throw new Meteor.Error(401, 'Must be active operator to subscribe to pendingGuesses');
  }

  const watcher = new PendingGuessWatcher(this);
  this.onStop(() => watcher.shutdown());
});

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

    const profile = Profiles.findOne(this.userId);
    const guesserDisplayName = (profile && profile.displayName) || '(no display name given)';
    const message = `${guesserDisplayName} submitted guess "${guess}"`;
    sendChatMessage(puzzleId, message, undefined);
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
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    checkMayUpdateGuess(this.userId, guess.hunt);
    Ansible.log(
      'Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'pending' }
    );
    transitionGuess(guess, 'pending');
  },

  markGuessCorrect(guessId: unknown) {
    check(guessId, String);
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    checkMayUpdateGuess(this.userId, guess.hunt);
    Ansible.log(
      'Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'correct' }
    );
    transitionGuess(guess, 'correct');
  },

  markGuessIncorrect(guessId: unknown) {
    check(guessId, String);
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    checkMayUpdateGuess(this.userId, guess.hunt);
    Ansible.log(
      'Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'incorrect' }
    );
    transitionGuess(guess, 'incorrect');
  },

  markGuessRejected(guessId: unknown) {
    check(guessId, String);
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }
    checkMayUpdateGuess(this.userId, guess.hunt);
    Ansible.log(
      'Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state: 'rejected' }
    );
    transitionGuess(guess, 'rejected');
  },
});
