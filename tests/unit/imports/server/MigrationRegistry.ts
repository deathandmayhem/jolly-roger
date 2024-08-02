import { Mongo } from "meteor/mongo";
import { assert } from "chai";
import type { MigrationControl } from "../../../../imports/server/MigrationRegistry";
import MigrationRegistry from "../../../../imports/server/MigrationRegistry";

const testCollection = new Mongo.Collection<MigrationControl>(
  "migrations_for_test",
);

function unlockedAt(version: number) {
  return {
    _id: "control",
    version,
    locked: false,
  };
}

describe("MigrationRegistry", function () {
  this.timeout(2000);

  beforeEach(async function () {
    await testCollection.removeAsync({});
  });

  it("bootstraps", async function () {
    const reg = new MigrationRegistry({ collection: testCollection });
    assert.equal(await testCollection.findOneAsync("control"), undefined);
    // Just calling getVersion bootstraps the record
    assert.equal(await reg.getVersion(), 0);
    assert.deepEqual(
      await testCollection.findOneAsync("control"),
      unlockedAt(0),
    );
    // Migrating to latest should be a noop, which we perform successfully.
    assert.equal(await reg.migrateToLatest(), true);
    assert.deepEqual(
      await testCollection.findOneAsync("control"),
      unlockedAt(0),
    );
  });

  it("runs a migration successfully", async function () {
    const reg = new MigrationRegistry({ collection: testCollection });
    let ran = false;
    reg.add({
      name: "simple migration",
      version: 1,
      up() {
        ran = true;
      },
    });
    await reg.migrateToLatest();
    assert.equal(ran, true);
    const version = await reg.getVersion();
    assert.equal(version, 1);
    assert.deepEqual(
      await testCollection.findOneAsync("control"),
      unlockedAt(1),
    );
  });

  it("runs migrations exactly once", async function () {
    const reg = new MigrationRegistry({ collection: testCollection });
    let runCount = 0;
    reg.add({
      name: "simple migration",
      version: 1,
      up() {
        runCount += 1;
      },
    });
    await reg.migrateToLatest();
    assert.equal(runCount, 1);
    await reg.migrateToLatest();
    assert.equal(runCount, 1);
  });

  it("records partial progress and is recoverable", async function () {
    const reg = new MigrationRegistry({ collection: testCollection });
    let runCount = 0;
    let shouldThrow = true;
    reg.add({
      name: "okay migration",
      version: 1,
      up() {
        runCount += 1;
      },
    });
    reg.add({
      name: "broken migration",
      version: 2,
      up() {
        // Throw the first time, then succeed if run again
        const willThrow = shouldThrow;
        shouldThrow = false;
        if (willThrow) {
          throw new Error("Something went wrong!");
        }
      },
    });

    const start = Date.now();
    try {
      await reg.migrateToLatest();
    } catch (e) {
      // ignore failure
    }
    // Expect that the database is still locked.
    const control = await testCollection.findOneAsync("control");
    assert.isDefined(control);
    const { locked, lockedAt } = control;
    assert.equal(locked, true);
    assert.isDefined(lockedAt);
    assert.isAtLeast(lockedAt.getTime(), start);

    // Expect that the first migration ran, once.
    assert.equal(runCount, 1);
    assert.equal(await reg.getVersion(), 1);

    // Expect that attempting to migrate while the control is locked fails.
    assert.equal(await reg.migrateToLatest(), false);
    assert.equal(await reg.getVersion(), 1);

    // Manually unlock the control record.
    await reg.unlock();
    assert.deepEqual(
      await testCollection.findOneAsync("control"),
      unlockedAt(1),
    );

    // Run the migrations again.  Expect the second migration to run and succeed.
    assert.equal(await reg.migrateToLatest(), true);
    assert.equal(await reg.getVersion(), 2);
  });

  it("preempts stale lock", async function () {
    const reg = new MigrationRegistry({ collection: testCollection });
    let runCount = 0;
    reg.add({
      name: "okay migration",
      version: 1,
      up() {
        /* noop */
      },
    });
    reg.add({
      name: "broken migration",
      version: 2,
      up() {
        runCount += 1;
        // Throw the first time, then succeed if run again.
        if (runCount < 2) {
          throw new Error("Something went wrong!");
        }
      },
    });

    const start = Date.now();
    try {
      await reg.migrateToLatest();
    } catch (e) {
      // ignore failure
    }
    // Expect that the database is still locked.
    const control = await testCollection.findOneAsync("control");
    assert.isDefined(control);
    const { locked, lockedAt } = control;
    assert.equal(locked, true);
    assert.isDefined(lockedAt);
    assert.isAtLeast(lockedAt.getTime(), start);

    // Expect that the first migration ran, once.
    assert.equal(runCount, 1);
    assert.equal(await reg.getVersion(), 1);

    // Expect that attempting to migrate while the control is locked fails.
    assert.equal(await reg.migrateToLatest(), false);
    assert.equal(await reg.getVersion(), 1);

    // Frob the collection to backdate the lockedAt time to 11 minutes in the
    // past, which exceeds our 10-minute preemption timeout.
    const now = new Date();
    const thePast = new Date(now.getTime() - 11 * 60 * 1000);
    const result = await testCollection.rawCollection().findOneAndUpdate(
      {
        _id: "control",
        locked: true,
      },
      {
        $set: {
          lockedAt: thePast,
        },
      },
    );
    assert(result.value);

    // Run the migrations again.  Expect the second migration to run and succeed.
    assert.equal(await reg.migrateToLatest(), true);
    assert.equal(await reg.getVersion(), 2);
  });
});
