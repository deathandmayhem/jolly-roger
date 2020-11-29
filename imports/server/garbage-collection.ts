// Used to perform periodic garbage collection tasks, particularly around
// previous server instances that would normally have taken care of cleanup
// themselves, but terminated ungracefully.

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import moment from 'moment';
import Servers from './models/servers';

const serverId = Random.id();

// Global registry of callbacks to run when we determine that a backend is dead.
const globalGCHooks: ((deadServers: string[]) => void)[] = [];

function registerPeriodicCleanupHook(f: (deadServers: string[]) => void): void {
  globalGCHooks.push(f);
}

function cleanup() {
  Servers.upsert({ _id: serverId }, {});

  // Servers disappearing should be a fairly rare occurrence, so it's
  // OK for the timeouts here to be generous. Servers get 120 seconds
  // to update before their records are GC'd. Should be long enough to
  // account for transients
  const timeout = moment().subtract('120', 'seconds').toDate();
  const deadServers = Servers.find({ updatedAt: { $lt: timeout } })
    .map((server) => server._id);
  if (deadServers.length === 0) {
    return;
  }

  // Run all hooks.
  for (let i = 0; i < globalGCHooks.length; i++) {
    const hook = globalGCHooks[i];
    hook(deadServers);
  }

  // Delete the record of the server, now that we've cleaned up after it.
  Servers.remove({ _id: { $in: deadServers } });
}

function periodic() {
  Meteor.setTimeout(periodic, 15000 + (15000 * Random.fraction()));
  cleanup();
}

Meteor.startup(() => periodic());

export { serverId, registerPeriodicCleanupHook };
