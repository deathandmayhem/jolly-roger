/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import { promisify } from 'util';
import { check } from 'meteor/check';
import { DDP } from 'meteor/ddp';
import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { Tracker } from 'meteor/tracker';
import TypedMethod from '../../imports/methods/TypedMethod';

export const USER_EMAIL = 'jolly-roger@deathandmayhem.com';
export const USER_PASSWORD = 'password';

const resetDatabaseMethod = new TypedMethod<{ testName: string }, void>('test.methods.resetDatabase');

if (Meteor.isServer) {
  const Migrations: typeof import('../../imports/server/migrations/Migrations').default =
    require('../../imports/server/migrations/Migrations').default;

  // We track a few bits of information here to make it easier to tell what's
  // going on in the event that the server receives concurrent `resetDatabase`
  // calls (which are forbidden, because wiping a DB while attempting to run
  // migrations is not going to result in correct behavior).

  // Number of times we have started a `test.resetDatabase` call
  let entries = 0;
  // Number of times we have completed a `test.resetDatabase` call
  let exits = 0;
  // The name of the test for which we are currently running
  // `test.resetDatabase`.  Helps debug which tests are incorrectly interleaving.
  let currentTest: string | undefined;
  // The connection handle of the connection for which we are servicing the current
  // `test.resetDatabase` invocation.
  let currentConn: Meteor.Connection | null | undefined;

  resetDatabaseMethod.define({
    validate(arg: unknown) {
      check(arg, { testName: String });

      return arg;
    },

    async run({ testName }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, 'This code must not run in production');
      }

      if (entries !== exits) {
        throw new Meteor.Error(500, `concurrent calls to test.resetDatabase: running: "${currentTest}" for conn ${currentConn!.id} from ${(currentConn!.httpHeaders as any)['user-agent']}, requested: "${testName}" on conn ${this.connection!.id} from ${(this.connection!.httpHeaders as any)['user-agent']}`);
      }

      entries += 1;
      currentTest = testName;
      currentConn = this.connection;

      // Remove all the contents of all not-mongo-internal collections
      const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
      const collections = await db.collections();
      const appCollections = collections.filter((col) => {
        // Exclude system collections and velocity collections.
        return !col.collectionName.startsWith('system.') && !col.collectionName.startsWith('velocity');
      });
      await appCollections.reduce(async (p, collection) => {
        await p;
        await collection.deleteMany({}, {});
      }, Promise.resolve());
      // Done removing collections.

      Migrations.config({ log: false });
      await Migrations.migrateToLatest();

      currentConn = undefined;
      currentTest = undefined;
      exits += 1;
    },
  });
}

export const resetDatabase = async (testName: string) => {
  // If we're logged in when we issue the call to test.resetDatabase, then
  // we will be logged out when our userId's doc is deleted from the users
  // database.  This causes us to be logged out mid-method call, which
  // causes Meteor to retry the method call, which results in concurrent
  // test.resetDatabase calls, which is undesirable behavior.
  // Since resetting the database force-logs us out anyway, we might as well
  // just get deterministic behavior by logging out first and then making
  // exactly one call to reset the database.
  if (Meteor.userId()) {
    await promisify(Meteor.logout)();
  }

  await resetDatabaseMethod.callPromise({ testName });
};

export const subscribeAsync =
  (name: string, ...args: any[]) => new Promise<Meteor.SubscriptionHandle>(
    (resolve, reject) => {
      const handle = Meteor.subscribe(name, ...args, {
        onStop: (reason?: Meteor.Error) => {
          if (reason) {
            reject(reason);
          }
        },
        onReady: () => {
          resolve(handle);
        },
      });
    }
  );

// waitForSubscriptions and afterFlush both taken from
// https://guide.meteor.com/testing.html#full-app-integration-test

const waitForSubscriptions = () => new Promise<void>((resolve) => {
  const poll = Meteor.setInterval(() => {
    // eslint-disable-next-line no-underscore-dangle
    if (DDP._allSubscriptionsReady()) {
      Meteor.clearInterval(poll);
      resolve();
    }
  }, 200);
});

const afterFlush = () => new Promise<void>((resolve) => {
  Tracker.afterFlush(resolve);
});

export const stabilize = async () => {
  await waitForSubscriptions();
  await afterFlush();
};
