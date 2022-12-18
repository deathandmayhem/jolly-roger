import { Meteor, Subscription } from 'meteor/meteor';
import { GLOBAL_SCOPE } from '../lib/is-admin';
import Guesses from '../lib/models/Guesses';
import Hunts from '../lib/models/Hunts';
import MeteorUsers from '../lib/models/MeteorUsers';
import Puzzles from '../lib/models/Puzzles';
import { GuessType } from '../lib/schemas/Guess';
import JoinPublisher, { PublishSpec } from './JoinPublisher';

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
          this.huntGuessWatchers[huntId] ||= new JoinPublisher(this.sub, huntGuessSpec, { state: 'pending', hunt: huntId }, { lingerTime: 5000 });
        });
      },
      changed: (_id, fields) => {
        if (!fields.roles) {
          return;
        }

        const { roles } = fields;

        Object.entries(roles).forEach(([huntId, huntRoles]) => {
          if (huntId === GLOBAL_SCOPE || !huntRoles.includes('operator')) return;
          this.huntGuessWatchers[huntId] ||= new JoinPublisher(this.sub, huntGuessSpec, { state: 'pending', hunt: huntId }, { lingerTime: 5000 });
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
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  const watcher = new PendingGuessWatcher(this);
  this.onStop(() => watcher.shutdown());
});
