import { Meteor } from "meteor/meteor";
import Logger from "../Logger";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import Locks from "./models/Locks";

// 10 seconds
export const PREEMPT_TIMEOUT = 10000;

async function tryAcquire(name: string) {
  return ignoringDuplicateKeyErrors(async () => {
    return Locks.insertAsync({ name });
  });
}

class Lock {
  constructor(public id: string) {}

  async renew() {
    const updated = await Locks.updateAsync(this.id, {
      $set: { renewedAt: new Date() },
    });
    if (updated === 0) {
      // we've already been preempted
      throw new Error(`Lock was preempted: id=${this.id}`);
    }
  }

  async [Symbol.asyncDispose]() {
    await Locks.removeAsync(this.id);
  }
}

export default async function withLock(name: string): Promise<Lock> {
  while (true) {
    await using stack = new AsyncDisposableStack();
    const cursor = Locks.find({ name });

    // Setup the watch now so we don't race between when we check
    // for the lock and when we wait for preemption
    const updated = new Promise<void>((resolve, reject) => {
      cursor
        .observeChangesAsync({
          changed() {
            resolve();
          },
          removed() {
            resolve();
          },
        })
        .then((handle) => {
          // If we get to the end of the loop before the watch is setup, the
          // stack might already be disposed, in which case we are no longer
          // needed
          if (stack.disposed) {
            handle.stop();
            return;
          }
          stack.adopt(handle, (h) => h.stop());
        })
        .catch(reject);
    });

    const lockId = await tryAcquire(name);
    if (lockId) {
      return new Lock(lockId);
    }

    // Otherwise sleep until we can preempt. (If the lock is removed or renewed,
    // the `updated` promise will resolve and we'll check again.)
    const otherLock = await cursor.fetchAsync().then((locks) => locks[0]);
    if (!otherLock) {
      // Lock was deleted, try again immediately
      continue;
    }

    const deadline =
      (otherLock.renewedAt || otherLock.createdAt).getTime() + PREEMPT_TIMEOUT;
    const timeout = deadline - Date.now();
    if (timeout <= 0) {
      // Lock is expired so we can preempt and try again
      Logger.warn("Preempting lock", { id: otherLock._id, name });
      await Locks.removeAsync({
        _id: otherLock._id,
        renewedAt: otherLock.renewedAt,
      });
      continue;
    }

    // Otherwise wait for either the lock to be updated or the timeout to expire
    const timedOut = new Promise<void>((resolve) => {
      stack.adopt(Meteor.setTimeout(resolve, timeout), (id) => {
        Meteor.clearTimeout(id);
      });
    });

    await Promise.race([updated, timedOut]);
  }
}
