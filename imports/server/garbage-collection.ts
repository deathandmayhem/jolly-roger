// Used to perform periodic garbage collection tasks, particularly around
// previous server instances that would normally have taken care of cleanup
// themselves, but terminated ungracefully.

import os from "os";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Logger from "../Logger";
import Servers from "../lib/models/Servers";

const serverId = Random.id();

// Global registry of callbacks to run when we determine that a backend is dead.
const globalGCHooks: ((deadServers: string[]) => void | Promise<void>)[] = [];

function registerPeriodicCleanupHook(
  f: (deadServers: string[]) => void | Promise<void>,
): void {
  globalGCHooks.push(f);
}

let firstUpsert = true;
async function cleanup() {
  const result = await Servers.upsertAsync(
    { _id: serverId },
    {
      $set: {
        pid: process.pid,
        hostname: os.hostname(),
      },
    },
  );
  if (!firstUpsert && result.insertedId) {
    Logger.warn("Server record unexpectedly deleted", {
      serverId,
      pid: process.pid,
      hostname: os.hostname(),
      error: new Error("Server record unexpectedly deleted"),
    });
  }
  firstUpsert = false;

  // Servers disappearing should be a fairly rare occurrence, so it's
  // OK for the timeouts here to be generous. Servers get 120 seconds
  // to update before their records are GC'd. Should be long enough to
  // account for transients
  const timeout = new Date(Date.now() - 120 * 1000);
  const deadServers = await Servers.find({
    updatedAt: { $lt: timeout },
  }).mapAsync((server) => server._id);
  if (deadServers.length === 0) {
    return;
  }

  Logger.info("Cleaning up dead servers", {
    deadServers: deadServers.join(","),
  });

  // Run all hooks.
  for (const f of globalGCHooks) {
    await f(deadServers);
  }

  // Delete the record of the server, now that we've cleaned up after it.
  await Servers.removeAsync({ _id: { $in: deadServers } });
}

export async function cleanupDeadServer(id: string) {
  for (const f of globalGCHooks) {
    await f([id]);
  }
  await Servers.removeAsync(id);
}

function periodic() {
  Meteor.setTimeout(periodic, 15000 + 15000 * Random.fraction());
  void cleanup();
}

// Defer the first run to give other startup hooks a chance to run
Meteor.startup(() =>
  Meteor.defer(() => {
    Logger.info("New server starting", { serverId });
    periodic();
  }),
);

export { serverId, registerPeriodicCleanupHook };
