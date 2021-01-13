import { check } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import Base from '../lib/models/base';
import Guesses from '../lib/models/guess';
import Hunts from '../lib/models/hunts';
import Puzzles from '../lib/models/puzzles';
import { BaseType } from '../lib/schemas/base';
import { GuessType } from '../lib/schemas/guess';
import { HuntType } from '../lib/schemas/hunts';
import { PuzzleType } from '../lib/schemas/puzzles';
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

// It's easier to create one observer per object, rather than try and have a
// single observer with an $in query. It means we don't have to start/stop the
// observer. Identical queries from different users will get deduped on the
// server side, and there are relatively few operators, so this should be
// reasonably safe.
class RecordUpdateObserver<T extends BaseType> {
  sub: Subscription;

  tableName: string;

  id: string;

  handle: Meteor.LiveQueryHandle;

  exists: boolean;

  constructor(sub: Subscription, id: string, model: Base<T>) {
    this.sub = sub;
    this.tableName = model.tableName;
    this.id = id;
    this.exists = false;
    this.handle = model.find(id).observeChanges({
      added: (_, fields) => {
        this.exists = true;
        this.sub.added(model.tableName, id, fields);
      },
      changed: (_, fields) => {
        this.sub.changed(model.tableName, id, fields);
      },
      removed: () => {
        this.exists = false;
        this.sub.removed(model.tableName, id);
      },
    });
  }

  destroy() {
    if (this.exists) {
      this.sub.removed(this.tableName, this.id);
    }

    this.handle.stop();
  }
}

class RefCountedObserverMap<T extends BaseType> {
  private sub: Subscription;

  private model: Base<T>;

  private subscribers: Map<string, { refCount: number, subscriber: RecordUpdateObserver<T> }>;

  constructor(sub: Subscription, model: Base<T>) {
    this.sub = sub;
    this.model = model;
    this.subscribers = new Map();
  }

  incref(id: string) {
    if (this.subscribers.has(id)) {
      this.subscribers.get(id)!.refCount += 1;
    } else {
      this.subscribers.set(id, {
        refCount: 1,
        subscriber: new RecordUpdateObserver(this.sub, id, this.model),
      });
    }
  }

  decref(id: string) {
    const record = this.subscribers.get(id);
    if (!record) {
      return;
    }
    record.refCount -= 1;
    if (record.refCount <= 0) {
      record.subscriber.destroy();
      this.subscribers.delete(id);
    }
  }
}

class PendingGuessWatcher {
  sub: Subscription

  guessCursor: Mongo.Cursor<GuessType>

  guessWatch: Meteor.LiveQueryHandle

  guesses: Record<string, GuessType>

  huntRefCounter: RefCountedObserverMap<HuntType>;

  puzzleRefCounter: RefCountedObserverMap<PuzzleType>

  constructor(sub: Subscription) {
    this.sub = sub;

    const user = Meteor.users.findOne(sub.userId)!;

    this.guessCursor = Guesses.find({ state: 'pending', hunts: { $in: user.hunts } });
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

  Roles.checkPermission(this.userId, 'mongo.guesses.update');

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
