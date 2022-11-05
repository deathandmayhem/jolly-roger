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

import { Mongo } from 'meteor/mongo';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';

export type Migration = {
  version: number;
  name: string;
  up: () => void | Promise<void>;
}

export type MigrationControl = {
  _id: string;
  version: number;
  locked: boolean;
  lockedAt?: Date;
}

// If the migrations lock has been held for 10 minutes, allow preempting it.
// This makes the assumption that all migrations can be run in <10 minutes.
const LOCK_PREEMPTION_TIMEOUT = 10 * 60 * 1000;

class MigrationRegistry {
  private collection: Mongo.Collection<MigrationControl>;

  private migrations: Migration[];

  private shouldLog: boolean;

  constructor({ collection }: {
    collection?: Mongo.Collection<MigrationControl>;
  }) {
    this.collection = collection ?? new Mongo.Collection<MigrationControl>('migrations');
    this.migrations = [];
    this.shouldLog = true;
  }

  config({ log }: {
    log: boolean;
  }) {
    this.shouldLog = log;
  }

  log(...args: any[]): void {
    if (this.shouldLog) {
      const [first, ...rest] = args;
      // eslint-disable-next-line no-console, no-underscore-dangle
      console.log(`Migrations(coll: ${this.collection._name}): ${first}`, ...rest);
    }
  }

  add(migration: Migration): void {
    // Registers a migration.  This should first be called on a Migration with version 1,
    // then second on a migration with version 2, and so on, keeping the registered versions
    // sequential and dense.

    // Require migration versions to be ordered, linear, and dense.
    if (migration.version !== (this.migrations.length + 1)) {
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
      this.log(`Not migrating, already at version ${observedVersion}`);
      return true;
    } else if (observedVersion > target) {
      this.log(`Not migrating, observed version ${observedVersion} exceeds target ${target}`);
      return false;
    }
    this.log(`Migrating: observed version ${observedVersion}, want ${target}`);
    // by elimination, observedVersion < target.  We have migrations to run.
    // Acquire the lock.  We might race with another backend that is also
    // trying to apply this same migration, so this.lock() uses findOneAndUpdate to
    // do an atomic swap.
    const control = await this.lock();
    if (!control) {
      this.log('Not migrating, control is locked');
      return false;
    } else {
      // We hold the lock.  Let's do some work.
      let applied = control.version;
      this.log(`Migrating: lock acquired at ${applied}: ${JSON.stringify(control)}`);

      while (applied < target) {
        // Remember, this.migrations is 0-indexed, while the migration
        // versions are 1-indexed so the DB contains the number of migrations
        // completed
        const nextMigration = this.migrations[applied];
        this.log(`running migration ${nextMigration.version} "${nextMigration.name}"`);
        // Run the next migration in sequence.
        // eslint-disable-next-line no-await-in-loop
        await nextMigration.up();
        // Save the fact that we ran the migration durably.
        // eslint-disable-next-line no-await-in-loop
        const prev = await this.collection.rawCollection().findOneAndUpdate({
          _id: 'control',
          locked: true,
          version: applied,
        }, {
          $set: {
            version: nextMigration.version,
          },
        });
        if (!prev) {
          throw new Error(`Couldn't record completion of migration ${nextMigration.version}`);
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
    const control = this.collection.findOne({ _id: 'control' });
    if (control === undefined) {
      await this.ensureControlCreated();
      // Query again because we're not holding a lock.
      return this.getVersion();
    } else {
      return control.version;
    }
  }

  private async ensureControlCreated() {
    this.log('creating control record at version 0');
    // We use insert rather than upsert here
    await ignoringDuplicateKeyErrors(async () => {
      await this.collection.insertAsync({
        _id: 'control',
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
    const result = await this.collection.rawCollection().findOneAndUpdate({
      $and: [
        { _id: 'control' },
        {
          $or: [
            { locked: false },
            { locked: true, lockedAt: { $lt: new Date(now.getTime() - LOCK_PREEMPTION_TIMEOUT) } },
          ],
        },
      ],
    }, {
      $set: {
        locked: true,
        lockedAt: now,
      },
    });
    if (result && result.value && result.value.locked) {
      this.log(`preempting stale lock (lockedAt ${result.value.lockedAt})`);
    }
    return result.value;
  }

  async unlock() {
    await this.collection.rawCollection().findOneAndUpdate({
      _id: 'control',
      locked: true,
    }, {
      $set: { locked: false },
      $unset: { lockedAt: 1 },
    });
  }
}

export default MigrationRegistry;
