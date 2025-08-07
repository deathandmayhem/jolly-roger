// A simple migrations library.
// We store a single record with the _id "control" in a "migrations" collection.
// It has two values of note:
//
// * version, an integer representing the number of migrations that have been completed
// * locked, a boolean indicating that some node has started (but not yet
//   completed) running migrations.
//
// Some notes on correctness:
// * We insert, rather than upsert, the first control record, so that we avoid the following race:
//   * backend A sees no control record
//   * backend B sees no control record
//   * backend A upserts (creates) control record
//   * backend A locks control record
//   * backend A runs migration 1
//   * backend A unlocks control record
//   * backend B upserts control record
//   * backend B locks control record
//   * backend B runs migration 1 again, even though backend A already ran it
// * We update the recorded version after each successful migration, to avoid
//   the following scenario:
//   * backend A tries to migrate to version 2, sees DB at version 0
//   * backend A locks control
//   * backend A runs migration 1
//   * backend A runs migration 2 but it crashes
//   * backend B comes along and migration 1 has fully applied, but if control
//     is manually unlocked it'll get run again.

import { Mongo } from "meteor/mongo";
import type winston from "winston";
import { logger } from "../Logger";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";

export type Migration = {
  version: number;
  name: string;
  up: () => void | Promise<void>;
};

export type MigrationControl = {
  _id: string;
  version: number;
  locked: boolean;
  lockedAt?: Date;
};

// If the migrations lock has been held for 10 minutes, allow preempting it.
// This makes the assumption that all migrations can be run in <10 minutes.
const LOCK_PREEMPTION_TIMEOUT = 10 * 60 * 1000;

class MigrationRegistry {
  private collection: Mongo.Collection<MigrationControl>;

  private migrations: Migration[];

  private logger: winston.Logger;

  constructor({
    collection,
  }: {
    collection?: Mongo.Collection<MigrationControl>;
  }) {
    this.collection =
      collection ?? new Mongo.Collection<MigrationControl>("migrations");
    this.migrations = [];
    this.logger = logger.child({
      label: "migrations",
      collection: this.collection._name,
    });
  }

  config({ log }: { log: boolean }) {
    this.logger.silent = !log;
  }

  add(migration: Migration): void {
    // Registers a migration.  This should first be called on a Migration with version 1,
    // then second on a migration with version 2, and so on, keeping the registered versions
    // sequential and dense.

    // Require migration versions to be ordered, linear, and dense.
    if (migration.version !== this.migrations.length + 1) {
      throw new Error(`Migrations must be registered in sequential order \
        (expected version ${this.migrations.length}, but "${migration.name}" had version ${migration.version}`);
    }
    this.migrations.push(migration);
  }

  async migrateToLatest(): Promise<boolean> {
    return this.migrateTo(this.migrations.length);
  }

  async migrateTo(target: number): Promise<boolean> {
    // Returns true if we believe we have successfully reached the target
    // version; false if control record was locked or the observed version
    // exceeded our target version.
    const observedVersion = await this.getVersion();
    if (observedVersion === target) {
      this.logger.info("Not migrating, already at version", {
        observedVersion,
      });
      return true;
    } else if (observedVersion > target) {
      this.logger.warn("Not migrating, observed version exceeds target", {
        observedVersion,
        target,
      });
      return false;
    }
    this.logger.info("Migrating", { observedVersion, want: target });
    // by elimination, observedVersion < target.  We have migrations to run.
    // Acquire the lock.  We might race with another backend that is also
    // trying to apply this same migration, so this.lock() uses findOneAndUpdate to
    // do an atomic swap.
    const control = await this.lock();
    if (!control) {
      this.logger.info("Not migrating, control is locked");
      return false;
    } else {
      // We hold the lock.  Let's do some work.
      let applied = control.version;
      this.logger.info("Migrating: lock acquired at applied", {
        applied,
        ...control,
      });

      while (applied < target) {
        // Remember, this.migrations is 0-indexed, while the migration
        // versions are 1-indexed so the DB contains the number of migrations
        // completed
        const nextMigration = this.migrations[applied]!;
        this.logger.info("Running migration", {
          version: nextMigration.version,
          name: nextMigration.name,
        });
        // Run the next migration in sequence.
        await nextMigration.up();
        // Save the fact that we ran the migration durably.
        const prev = await this.collection.rawCollection().findOneAndUpdate(
          {
            _id: "control",
            locked: true,
            version: applied,
          },
          {
            $set: {
              version: nextMigration.version,
            },
          },
        );
        if (!prev) {
          throw new Error(
            `Couldn't record completion of migration ${nextMigration.version}`,
          );
        }
        applied += 1;
      }

      // We've finished applying migrations.  Release the lock and report success.
      await this.unlock();
      return true;
    }
  }

  async getVersion(): Promise<number> {
    // The value in the database represents the last migration that has
    // completed successfully, which (as a result of the structure of migration
    // numbering) is equal to the number of migrations that have run.
    //
    // If there is no record in the database, no migrations have run.  We will
    // backfill a record to give us a place to store a lock and update the
    // version.
    //
    // If there is a record in the database, then its version indicates the
    // number of migrations that have been run to completion successfully.
    const control = await this.collection.findOneAsync({ _id: "control" });
    if (control === undefined) {
      await this.ensureControlCreated();
      // Query again because we're not holding a lock.
      return this.getVersion();
    } else {
      return control.version;
    }
  }

  private async ensureControlCreated() {
    this.logger.info("Creating control record at version 0");
    // We use insert rather than upsert here
    await ignoringDuplicateKeyErrors(async () => {
      await this.collection.insertAsync({
        _id: "control",
        version: 0,
        locked: false,
      });
    });
  }

  async lock() {
    // Attempts to take out a lock.
    // If successful, returns the control object as it was *before* we claimed the lock.
    // If unsuccessful (because the control object was recently locked, and the preemption timeout
    // has not passed), returns null.
    const now = new Date();
    // TODO: remove this typecast once the resolved type definitions match reality
    const result = await (this.collection.rawCollection().findOneAndUpdate(
      {
        $and: [
          { _id: "control" },
          {
            $or: [
              { locked: false },
              {
                locked: true,
                lockedAt: {
                  $lt: new Date(now.getTime() - LOCK_PREEMPTION_TIMEOUT),
                },
              },
            ],
          },
        ],
      },
      {
        $set: {
          locked: true,
          lockedAt: now,
        },
      },
    ) as unknown as Promise<MigrationControl | null>);
    if (result?.locked) {
      this.logger.warn("Preempting stale lock", {
        lockedAt: result.lockedAt,
      });
    }
    return result;
  }

  async unlock() {
    await this.collection.rawCollection().findOneAndUpdate(
      {
        _id: "control",
        locked: true,
      },
      {
        $set: { locked: false },
        $unset: { lockedAt: 1 },
      },
    );
  }
}

export default MigrationRegistry;
