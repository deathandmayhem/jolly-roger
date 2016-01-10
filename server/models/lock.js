// Locks are a server-only class

Future = Npm.require('fibers/future');

Schemas.Lock = new SimpleSchema({
  name: {
    type: String,
  },
  createdAt: {
    type: Date,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return {$setOnInsert: new Date()};
      } else {
        this.unset(); // Prevent user from supplying their own value
      }
    },
  },
});

// 10 seconds
const PREEMPT_TIMEOUT = 10000;

Models.Locks = new class extends Meteor.Collection {
  constructor() {
    super('jr_locks');
  }

  _tryAcquire(name) {
    try {
      return this.insert({name});
    } catch (e) {
      if (e.name === 'MongoError' && e.code === 11000) {
        return null;
      }

      throw e;
    }
  }

  _release(lock) {
    this.remove(lock);
  }

  withLock(name, critSection) {
    while (true) {
      let handle;
      let lock;
      try {
        const cursor = this.find({name});

        // Setup the watch now so we don't race between when we check
        // for the lock and when we wait for premption
        const removed = new Future();
        handle = cursor.observeChanges({
          removed() {
            removed.return(true);
          },
        });

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
          Ansible.log('Prempting lock', {id: otherLock._id, name});
          this._release(otherLock._id);
        }
      } finally {
        if (handle) {
          handle.stop();
        }

        if (lock) {
          this._release(lock);
        }
      }
    }
  }
}();
Models.Locks.attachSchema(Schemas.Lock);
