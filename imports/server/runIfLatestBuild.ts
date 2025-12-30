import { promises as fs } from "node:fs";
import { Meteor } from "meteor/meteor";
import Logger from "../Logger";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import LatestDeploymentTimestamps from "./models/LatestDeploymentTimestamps";

export const hooks = new Set<() => Promise<void>>();

// runIfLatestBuild registers a hook which runs on server startup, but only if
// this is the most recent build timestamp that we've observed (otherwise the
// hook is skipped)
export default function runIfLatestBuild(fn: () => Promise<void>) {
  hooks.add(fn);
}

Meteor.startup(async () => {
  // Meteor async startup hooks will block startup until they resolve, which is
  // what we want here - if this fails, we want to crash the application.

  const stat = await fs.stat(process.argv[1]!);
  const buildTimestamp = stat.mtime;

  const previousLatest =
    await LatestDeploymentTimestamps.findOneAsync("default");
  if (previousLatest && previousLatest.buildTimestamp > buildTimestamp) {
    Logger.warn("Skipping startup hooks because we are not the latest", {
      previousTimestamp: previousLatest.buildTimestamp,
      previousRevision: previousLatest.gitRevision,
      buildTimestamp,
    });
  } else {
    for (const fn of hooks) {
      await fn();
    }

    await ignoringDuplicateKeyErrors(async () => {
      await LatestDeploymentTimestamps.insertAsync({
        _id: "default",
        buildTimestamp,
        gitRevision: Meteor.gitCommitHash!,
      });
    });

    await LatestDeploymentTimestamps.updateAsync(
      {
        _id: "default",
        buildTimestamp: { $lt: buildTimestamp },
      },
      {
        $set: {
          buildTimestamp,
          gitRevision: Meteor.gitCommitHash!,
        },
      },
    );
  }
});
