// Locks are a server-only class
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Promise as MeteorPromise } from 'meteor/promise';
import Ansible from '../../Ansible';
import ignoringDuplicateKeyErrors from '../ignoringDuplicateKeyErrors';
import LockSchema, { LockType } from '../schemas/Lock';

// 10 seconds
export const PREEMPT_TIMEOUT = 10000;

const Locks = new class extends Mongo.Collection<LockType> {
  constructor() {
    super('jr_locks');
  }

  _tryAcquire(name: string) {
    return ignoringDuplicateKeyErrors(() => {
      // Because the Mongo.Collection doesn't know about SimpleSchema
      // autovalues, it doesn't know which fields are actually required. Cast to
      // any since this is known safe
      return this.insert(<any>{ name });
    });
  }

  _release(lock: string) {
    this.remove(lock);
  }

  renew(id: string) {
    const updated = this.update(id, { $set: { renewedAt: new Date() } });
    if (updated === 0) {
      // we've already been preempted
      throw new Error(`Lock was preempted: id=${id}`);
    }
  }

  withLock<T>(name: string, critSection: (id: string) => T) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let handle: Meteor.LiveQueryHandle | undefined;
      let lock: string | undefined;
      let timeoutHandle: number | undefined;

      const cleanupWatches = () => {
        if (handle) {
          handle.stop();
          handle = undefined;
        }
        if (timeoutHandle) {
          Meteor.clearTimeout(timeoutHandle);
          timeoutHandle = undefined;
        }
      };
      try {
        const cursor = this.find({ name });

        // Setup the watch now so we don't race between when we check
        // for the lock and when we wait for preemption
        const removed = new Promise<undefined>((resolve) => {
          handle = cursor.observeChanges({
            removed() {
              resolve(undefined);
            },
          });
        });

        // eslint-disable-next-line no-underscore-dangle
        lock = this._tryAcquire(name);
        if (lock) {
          return critSection(lock);
        }

        // Lock is held, so wait until we can preempt
        const timedOut = new Promise<LockType | undefined>((resolve) => {
          const waitForDeadline = () => {
            const otherLock = cursor.fetch()[0];
            if (!otherLock) {
              // Lock was deleted, so removed promise will resolve
              resolve(undefined);
              return;
            }

            const deadline =
              (otherLock.renewedAt || otherLock.createdAt).getTime() +
              PREEMPT_TIMEOUT;
            const timeout = deadline - Date.now();

            if (timeout <= 0) {
              // Lock is expired, so we can preempt it
              resolve(otherLock);
              return;
            }

            // Otherwise wait until expiration and then check again
            timeoutHandle = Meteor.setTimeout(waitForDeadline, timeout);
          };
          waitForDeadline();
        });

        // If we time out, then preempt
        const preemptableLock = MeteorPromise.await(Promise.race([removed, timedOut]));
        cleanupWatches();
        if (preemptableLock) {
          Ansible.log('Preempting lock', { id: preemptableLock._id, name });
          this.remove({ _id: preemptableLock._id, renewedAt: preemptableLock.renewedAt });
        }
      } finally {
        cleanupWatches();

        if (lock) {
          // eslint-disable-next-line no-underscore-dangle
          this._release(lock);
        }
      }
    }
  }
}();
Locks.attachSchema(LockSchema);

export default Locks;
