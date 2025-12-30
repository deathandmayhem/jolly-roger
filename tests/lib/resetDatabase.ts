import { promisify } from "node:util";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { MongoInternals } from "meteor/mongo";
import TypedMethod from "../../imports/methods/TypedMethod";

const resetDatabaseMethod = new TypedMethod<{ testName: string }, void>(
  "test.methods.resetDatabase",
);

let resetDatabase: (testName: string) => Promise<void>;

if (Meteor.isServer) {
  const defineMethod: typeof import("../../imports/server/methods/defineMethod").default =
    require("../../imports/server/methods/defineMethod").default;
  const Migrations: typeof import("../../imports/server/migrations/Migrations").default =
    require("../../imports/server/migrations/Migrations").default;

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

  resetDatabase = async (testName: string) => {
    if (!Meteor.isAppTest) {
      throw new Meteor.Error(500, "This code must not run in production");
    }

    if (entries !== exits) {
      throw new Meteor.Error(
        500,
        `concurrent calls to test.resetDatabase: running: "${currentTest}", requested: "${testName}"`,
      );
    }

    entries += 1;
    currentTest = testName;

    // Remove all the contents of all not-mongo-internal collections
    const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
    const collections = await db.collections();
    const appCollections = collections.filter((col) => {
      // Exclude system collections and velocity collections.
      return (
        !col.collectionName.startsWith("system.") &&
        !col.collectionName.startsWith("velocity")
      );
    });
    for (const collection of appCollections) {
      await collection.deleteMany({}, {});
    }
    // Done removing collections.

    Migrations.config({ log: false });
    await Migrations.migrateToLatest();

    currentTest = undefined;
    exits += 1;
  };

  defineMethod(resetDatabaseMethod, {
    validate(arg: unknown) {
      check(arg, { testName: String });

      return arg;
    },
    run({ testName }) {
      return resetDatabase(testName);
    },
  });
} /* isClient */ else {
  resetDatabase = async (testName: string) => {
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
}

export default resetDatabase;
