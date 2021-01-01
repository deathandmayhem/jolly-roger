// Locks are a server-only class
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Ansible from '../../ansible';
import LockSchema, { LockType } from '../schemas/lock';

declare const Npm: any;
const Future = Npm.require('fibers/future');

// 10 seconds
export const PREEMPT_TIMEOUT = 10000;

const Locks = new class extends Mongo.Collection<LockType> {
  constructor() {
    super('jr_locks');
  }

  _tryAcquire(name: string) {
    try {
      // Because the Mongo.Collection doesn't know about SimpleSchema
      // autovalues, it doesn't know which fields are actually required. Cast to
      // any since this is known safe
      return this.insert(<any>{ name });
    } catch (e) {
      if ((e.name === 'MongoError' || e.name === 'BulkWriteError') && e.code === 11000) {
        return null;
      }

      throw e;
    }
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
      let handle;
      let lock;
      try {
        const cursor = this.find({ name });

        // Setup the watch now so we don't race between when we check
        // for the lock and when we wait for premption
        const removed = new Future();
        handle = cursor.observeChanges({
          removed() {
            removed.return(undefined);
          },
        });

        // eslint-disable-next-line no-underscore-dangle
        lock = this._tryAcquire(name);
        if (lock) {
          return critSection(lock);
        }

        // Lock is held, so wait until we can preempt and try again
        let timeoutHandle: number | undefined;
        const monitorTimeout = () => {
          const otherLock = cursor.fetch()[0];
          const time = otherLock.renewedAt || otherLock.createdAt;
          const timeout = (time.getTime() + PREEMPT_TIMEOUT) - (new Date()).getTime();

          if (timeout < 0) {
            removed.return(otherLock);
          } else {
            timeoutHandle = Meteor.setTimeout(() => monitorTimeout(), timeout);
          }
        };
        monitorTimeout();

        // If we time out, then preempt
        const preemptableLock: LockType = removed.wait();
        if (timeoutHandle !== undefined) {
          Meteor.clearTimeout(timeoutHandle);
        }

        if (preemptableLock) {
          // Stop the observe handle - the record is about to be
          // removed and we don't want to double-fire the future.
          handle.stop();
          handle = undefined;
          Ansible.log('Prempting lock', { id: preemptableLock._id, name });
          this.remove({ _id: preemptableLock._id, renewedAt: preemptableLock.renewedAt });
        }
      } finally {
        if (handle) {
          handle.stop();
        }

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
