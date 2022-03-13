import { check } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import Ansible from '../Ansible';
import { GLOBAL_SCOPE } from '../lib/is-admin';
import Guesses from '../lib/models/Guesses';
import Hunts from '../lib/models/Hunts';
import MeteorUsers from '../lib/models/MeteorUsers';
import Puzzles from '../lib/models/Puzzles';
import { userMayUpdateGuessesForHunt } from '../lib/permission_stubs';
import { GuessType } from '../lib/schemas/Guess';
import GlobalHooks from './GlobalHooks';
import JoinPublisher, { PublishSpec } from './JoinPublisher';
import { sendChatMessage } from './chat';

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

  userWatch: Meteor.LiveQueryHandle;

  huntGuessWatchers: Record<string, JoinPublisher<GuessType>>;

  constructor(sub: Subscription) {
    this.sub = sub;
    this.huntGuessWatchers = {};

    const huntGuessSpec: PublishSpec<GuessType> = {
      model: Guesses,
      foreignKeys: [{
        field: 'hunt',
        join: { model: Hunts },
      }, {
        field: 'puzzle',
        join: { model: Puzzles },
      }, {
        field: 'createdBy',
        join: {
          model: MeteorUsers,
          projection: { displayName: 1 },
        },
      }],
    };

    this.userWatch = MeteorUsers.find(sub.userId!, { fields: { roles: 1 } }).observeChanges({
      added: (_id, fields) => {
        const { roles = {} } = fields;

        Object.entries(roles).forEach(([huntId, huntRoles]) => {
          if (huntId === GLOBAL_SCOPE || !huntRoles.includes('operator')) return;
          this.huntGuessWatchers[huntId] ||= new JoinPublisher(this.sub, huntGuessSpec, { state: 'pending', hunt: huntId });
        });
      },
      changed: (_id, fields) => {
        if (!fields.roles) {
          return;
        }

        const { roles } = fields;

        Object.entries(roles).forEach(([huntId, huntRoles]) => {
          if (huntId === GLOBAL_SCOPE || !huntRoles.includes('operator')) return;
          this.huntGuessWatchers[huntId] ||= new JoinPublisher(this.sub, huntGuessSpec, { state: 'pending', hunt: huntId });
        });

        Object.keys(this.huntGuessWatchers).forEach((huntId) => {
          if (!roles[huntId] || !roles[huntId].includes('operator')) {
            this.huntGuessWatchers[huntId].shutdown();
            delete this.huntGuessWatchers[huntId];
          }
        });
      },
      // assume the user won't be removed
    });

    this.sub.ready();
  }

  shutdown() {
    this.userWatch.stop();
    Object.values(this.huntGuessWatchers).forEach((watcher) => watcher.shutdown());
  }
}

// Publish pending guesses enriched with puzzle and hunt. This is a dedicated
// publish because every operator needs this information for the notification
// center, and without assistance they need an overly broad subscription to the
// related collections
//
// Note that there's no restriction on this sub, beyond being logged in. This is
// safe because we won't publish guesses for hunts for which you're not an
// operator. However, most clients aren't expected to subscribe to it, because
// we check on the client if they're an operator for any hunt before making the
// subscription. Doing this on the client means we can make it a reactive
// computation, whereas if we used a permissions check on the server to
// short-circuit the sub, we could not.
Meteor.publish('pendingGuesses', function () {
  check(this.userId, String);

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
    const guessId = Guesses.insert({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess,
      direction,
      confidence,
      state: 'pending',
    });

    const user = MeteorUsers.findOne(this.userId)!;
    const guesserDisplayName = user.displayName || '(no display name given)';
    const message = `${guesserDisplayName} submitted guess "${guess}"`;
    sendChatMessage(puzzleId, message, undefined);

    return guessId;
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
