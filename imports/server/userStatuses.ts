// Used to track subscribers to the subscribers.counts record set
//
// So long as the server continues running, it can clean up after
// itself (and does so). But if the server process is killed (or dies
// of more natural causes), its server record will stick around, so we
// garbage collect subscriber records based on the updatedAt of the
// server record.

import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { serverId, registerPeriodicCleanupHook } from "./garbage-collection";
import { trace } from "console";
import UserStatuses from "../lib/models/UserStatuses";

// Clean up leaked subscribers from dead servers periodically.
async function cleanupHook(deadServers: string[]) {
  await UserStatuses.removeAsync({ server: { $in: deadServers } });
}
registerPeriodicCleanupHook(cleanupHook);
// user status tracking

Meteor.publish("userStatus.inc", async function (hunt, type, status, puzzle?) {
  check(status, String);
  check(hunt, String);
  check(type, String);
  check(puzzle, Match.Optional(String));

  if (!this.userId) {
    return [];
  }

  let selectionCriteria = {
    server: serverId,
    connection: this.connection.id,
    user: this.userId,
    type,
    hunt,
  }

  if (puzzle){
    selectionCriteria.puzzle = puzzle;
  }

  // Remove any existing "offline" records for this user and hunt,
  // since we only care about them if they're not online
  await UserStatuses.removeAsync({
    user: this.userId,
    type: type,
    hunt: hunt,
    status: "offline",
  });

  await UserStatuses.upsertAsync(selectionCriteria,
    {
      $set: {
        status: status,
      },
    }
  );

  this.onStop(async () => {
    // Update the status to "offline" when the subscription ends
    await UserStatuses.updateAsync(selectionCriteria, {
      $set: { status: "offline" }
    });
  });

  return [];
});

Meteor.publish("userStatus.fetch", async function (huntId) {
  check(huntId, String);
  trace("huntId: " + huntId);

  if (!this.userId) {
    return [];
  }

  const user = await Meteor.users.findOneAsync(this.userId);
  if (!user?.hunts?.includes(huntId)) {
    return [];
  }

  // return UserStatuses.find({ hunt: huntId });

  const cursor = UserStatuses.find({ hunt: huntId });
  const handle = cursor.observeChanges({
    added: (id, fields) => {
        this.added("UserStatuses", id, { ...fields, hunt: huntId }); // Add hunt field!
    },
    changed: (id, fields) => {
      this.changed("UserStatuses", id, fields);
    },
    removed: (id) => {
      this.removed("UserStatuses", id);
  },
});
  this.onStop(() => handle.stop());
  this.ready();
  return undefined;
});
