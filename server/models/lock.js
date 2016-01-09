// Locks are a server-only class

Future = Npm.require('fibers/future');

sleep = (ms) => {
  const future = new Future();
  setTimeout(function() {
    future.return();
  }, ms);

  return future;
};

Schemas.Lock = new SimpleSchema({
  name: {
    type: String,
  },
});

Models.Locks = new class extends Mongo.Collection {
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
        const removed = new Future();
        handle = cursor.observeChanges({
          removed() {
            removed.return();
          },
        });

        lock = this._tryAcquire(name);
        if (lock) {
          return critSection();
        } else {
          removed.wait();
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
