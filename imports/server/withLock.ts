import { Meteor } from 'meteor/meteor';
import Logger from '../Logger';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import type { LockType } from './models/Locks';
import Locks from './models/Locks';

// 10 seconds
export const PREEMPT_TIMEOUT = 10000;

async function tryAcquire(name: string) {
  return ignoringDuplicateKeyErrors(async () => {
    // Because the Mongo.Collection doesn't know about SimpleSchema
    // autovalues, it doesn't know which fields are actually required. Cast to
    // any since this is known safe
    return Locks.insertAsync(<any>{ name });
  });
}

async function release(lock: string) {
  await Locks.removeAsync(lock);
}

async function renew(id: string) {
  const updated = await Locks.updateAsync(id, { $set: { renewedAt: new Date() } });
  if (updated === 0) {
    // we've already been preempted
    throw new Error(`Lock was preempted: id=${id}`);
  }
}

export default async function withLock<T>(
  name: string,
  critSection: (renew: () => Promise<void>) => Promise<T>
) {
  while (true) {
    await using cleanup = new AsyncDisposableStack();

    const cursor = Locks.find({ name });

    // Setup the watch now so we don't race between when we check
    // for the lock and when we wait for preemption
    const removed = new Promise<undefined>((resolve) => {
      const handle = cursor.observeChanges({
        removed() {
          resolve(undefined);
        },
      });
      cleanup.defer(() => handle.stop());
    });

    const lock = await tryAcquire(name);
    if (lock) {
      cleanup.defer(() => release(lock));
      return critSection(() => renew(lock));
    }

    // Lock is held, so wait until we can preempt
    const timedOut = new Promise<LockType | undefined>((resolve) => {
      let timeoutHandle: number | undefined;
      cleanup.defer(() => {
        if (timeoutHandle) Meteor.clearTimeout(timeoutHandle);
      });
      const waitForDeadline = async () => {
        timeoutHandle = undefined;
        const otherLock = (await cursor.fetchAsync())[0];
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
      void waitForDeadline();
    });

    // If we time out, then preempt
    const preemptableLock = await Promise.race([removed, timedOut]);
    if (preemptableLock) {
      Logger.warn('Preempting lock', { id: preemptableLock._id, name });
      await Locks.removeAsync({
        _id: preemptableLock._id,
        renewedAt: preemptableLock.renewedAt,
      });
    }
  }
}
