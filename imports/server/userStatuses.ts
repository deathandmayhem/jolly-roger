import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import UserStatuses from "../lib/models/UserStatuses";
import { registerPeriodicCleanupHook, serverId } from "./garbage-collection";

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

  const selectionCriteria = {
    server: serverId,
    connection: this.connection.id,
    user: this.userId,
    type,
    hunt,
  };

  if (puzzle) {
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

  await UserStatuses.upsertAsync(selectionCriteria, {
    $set: {
      status: status,
    },
  });

  this.onStop(async () => {
    // Update the status to "offline" when the subscription ends
    await UserStatuses.updateAsync(selectionCriteria, {
      $set: { status: "offline" },
    });
  });

  return [];
});
