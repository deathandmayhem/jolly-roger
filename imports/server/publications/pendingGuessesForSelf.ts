import { GLOBAL_SCOPE } from '../../lib/isAdmin';
import Guesses from '../../lib/models/Guesses';
import type { GuessType } from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import pendingGuessesForSelf from '../../lib/publications/pendingGuessesForSelf';
import type { SubSubscription } from '../PublicationMerger';
import PublicationMerger from '../PublicationMerger';
import type { PublishSpec } from '../publishJoinedQuery';
import publishJoinedQuery from '../publishJoinedQuery';
import definePublication from './definePublication';

const LINGER_TIME = 5000;

definePublication(pendingGuessesForSelf, {
  run() {
    if (!this.userId) {
      return [];
    }

    const huntGuessWatchers: Record<string, SubSubscription> = {};

    const merger = new PublicationMerger(this);

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

    const userWatch = MeteorUsers.find(this.userId, { fields: { roles: 1 } }).observeChanges({
      added: (_id, fields) => {
        const { roles = {} } = fields;

        Object.entries(roles).forEach(([huntId, huntRoles]) => {
          if (huntId === GLOBAL_SCOPE || !huntRoles.includes('operator')) return;
          if (!(huntId in huntGuessWatchers)) {
            const subSubscription = merger.newSub();
            publishJoinedQuery(subSubscription, huntGuessSpec, { state: 'pending', hunt: huntId });
            huntGuessWatchers[huntId] = subSubscription;
          }
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
          if (!(huntId in huntGuessWatchers)) {
            const subSubscription = merger.newSub();
            publishJoinedQuery(subSubscription, huntGuessSpec, { state: 'pending', hunt: huntId });
            huntGuessWatchers[huntId] = subSubscription;
          }
        });

        Object.keys(huntGuessWatchers).forEach((huntId) => {
          if (!roles[huntId] || !roles[huntId]!.includes('operator')) {
            const subSubscription = huntGuessWatchers[huntId];
            if (subSubscription) {
              merger.removeSub(subSubscription);
            }
            delete huntGuessWatchers[huntId];
          }
        });
      },
      // assume the user won't be removed
    });
    this.onStop(() => userWatch.stop());
    this.ready();

    return undefined;
  },
});
