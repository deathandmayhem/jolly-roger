import type { Meteor, Subscription } from 'meteor/meteor';
import { GLOBAL_SCOPE } from '../../lib/isAdmin';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import pendingGuessesForSelf from '../../lib/publications/pendingGuessesForSelf';
import type { GuessType } from '../../lib/schemas/Guess';
import type { PublishSpec } from '../JoinPublisher';
import JoinPublisher from '../JoinPublisher';
import definePublication from './definePublication';

const LINGER_TIME = 5000;

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
      // top-level Guess object and its referents should linger so we can
      // display it in the guess queue briefly after processing for continuity
      lingerTime: LINGER_TIME,
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
        if (!Object.prototype.hasOwnProperty.call(fields, 'roles')) {
          // roles were unchanged
          return;
        }

        const { roles = {} } = fields;

        Object.entries(roles).forEach(([huntId, huntRoles]) => {
          if (huntId === GLOBAL_SCOPE || !huntRoles.includes('operator')) return;
          this.huntGuessWatchers[huntId] ||= new JoinPublisher(this.sub, huntGuessSpec, { state: 'pending', hunt: huntId });
        });

        Object.keys(this.huntGuessWatchers).forEach((huntId) => {
          if (!roles[huntId] || !roles[huntId]!.includes('operator')) {
            this.huntGuessWatchers[huntId]?.shutdown();
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

definePublication(pendingGuessesForSelf, {
  run() {
    if (!this.userId) {
      return [];
    }

    const watcher = new PendingGuessWatcher(this);
    this.onStop(() => watcher.shutdown());
    return undefined;
  },
});
