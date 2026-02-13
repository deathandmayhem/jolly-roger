// Used to perform periodic garbage collection tasks, particularly around
// previous server instances that would normally have taken care of cleanup
// themselves, but terminated ungracefully.

import os from "node:os";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Logger from "../Logger";
import { gracePeriod, refreshIntervalBase } from "../lib/garbageCollection";
import Servers from "../lib/models/Servers";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import onExit from "./onExit";

const serverId = Random.id();

// Global registry of callbacks to run when we determine that a backend is dead.
const globalGCHooks: ((deadServers: string) => void | Promise<void>)[] = [];

function registerPeriodicCleanupHook(
  f: (deadServer: string) => void | Promise<void>,
): void {
  globalGCHooks.push(f);
}

async function cleanup() {
  const updated = await Servers.updateAsync(
    {
      _id: serverId,
      cleanupInProgressBy: { $exists: false },
    },
    {
      $set: {
        updatedAt: new Date(),
      },
    },
  );
  if (updated === 0) {
    // Someone else is cleaning us up. The observer below should notice this and
    // exit, but we should go ahead and short-circuit to avoid doing any more
    // work
    return;
  }

  const timeout = new Date(Date.now() - gracePeriod);
  const deadServers = await Servers.find({
    updatedAt: { $lt: timeout },
  }).mapAsync((server) => server._id);

  if (deadServers.length === 0) {
    return;
  }

  Logger.info("Cleaning up dead servers", {
    deadServers: deadServers.join(","),
  });
  for (const deadServer of deadServers) {
    await cleanupDeadServer(deadServer);
  }
}

export async function cleanupDeadServer(id: string) {
  // First mark that we're cleaning up the server so that if it wakes back up it
  // knows to abort
  const updated = await Servers.updateAsync(
    { _id: id, cleanupInProgressBy: { $exists: false } },
    {
      $set: { cleanupInProgressBy: serverId },
    },
  );
  if (updated === 0) {
    // Someone else is already cleaning this up
    return;
  }

  for (const f of globalGCHooks) {
    await f(id);
  }
  await Servers.removeAsync(id);
}

registerPeriodicCleanupHook(async (deadServer) => {
  // If a server died while cleaning up another server, we want to unmark it as
  // being cleaned up so that someone else picks it up
  await Servers.updateAsync(
    { cleanupInProgressBy: deadServer },
    { $unset: { cleanupInProgressBy: "" } },
    { multi: true },
  );
});

function periodic() {
  Meteor.setTimeout(
    periodic,
    refreshIntervalBase + refreshIntervalBase * Random.fraction(),
  );
  cleanup().catch((error) => {
    Logger.error("Error performing garbage-collection cleanup()", { error });
  });
}

Meteor.startup(() => {
  // Defer the first run so that other startup hooks run first, but don't catch
  // this async function's errors, because if it fails we want the failure to
  // bubble up and abort the process
  setImmediate(async () => {
    Logger.info("New server starting", {
      serverId,
      pid: process.pid,
      hostname: os.hostname(),
    });

    if (!Meteor.isAppTest) {
      const aborted = () => {
        Logger.error("Server record unexpectedly marked for deletion", {
          serverId,
          pid: process.pid,
          hostname: os.hostname(),
        });
        process.exit(1);
      };

      const handle = await Servers.find(serverId).observeChangesAsync({
        changed(_, fields) {
          if (fields.cleanupInProgressBy) {
            aborted();
          }
        },
        removed() {
          aborted();
        },
      });

      onExit(() => handle.stop());
    }

    // Ignore duplicate key errors because they could be caused by retries (we
    // don't expect any actual collisions on server ID)
    await ignoringDuplicateKeyErrors(async () => {
      const now = new Date();
      await Servers.insertAsync({
        _id: serverId,
        pid: process.pid,
        hostname: os.hostname(),
        createdAt: now,
        updatedAt: now,
      });
    });

    periodic();
  });
});

export { serverId, registerPeriodicCleanupHook };
