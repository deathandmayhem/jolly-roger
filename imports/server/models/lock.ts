// Locks are a server-only class
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import Ansible from '../../ansible';
import LockSchema, { LockType } from '../schemas/lock';

// global Npm
const Future = Npm.require('fibers/future');

// 10 seconds
const PREEMPT_TIMEOUT = 10000;

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
      if (e.name === 'MongoError' && e.code === 11000) {
        return null;
      }

      throw e;
    }
  }

  _release(lock: string) {
    this.remove(lock);
  }

  withLock<T>(name: string, critSection: () => T) {
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
            removed.return(true);
          },
        });

        // eslint-disable-next-line no-underscore-dangle
        lock = this._tryAcquire(name);
        if (lock) {
          return critSection();
        }

        // Lock is held, so wait until we can preempt and try again
        const otherLock = cursor.fetch()[0];
        const timeout = (otherLock.createdAt.getTime() + PREEMPT_TIMEOUT) - (new Date()).getTime();
        Meteor.setTimeout(() => removed.return(false), timeout);

        // If the lock can already be preempted, or we timed out, then
        // preempt
        if (timeout < 0 || !removed.wait()) {
          // Stop the observe handle - the record is about to be
          // removed and we don't want to double-fire the future.
          handle.stop();
          Ansible.log('Prempting lock', { id: otherLock._id, name });
          // eslint-disable-next-line no-underscore-dangle
          this._release(otherLock._id);
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
