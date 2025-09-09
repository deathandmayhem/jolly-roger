import { promises as fs } from "fs";
import { Meteor } from "meteor/meteor";
import Logger from "../Logger";
import ignoringDuplicateKeyErrors from "./ignoringDuplicateKeyErrors";
import LatestDeploymentTimestamps from "./models/LatestDeploymentTimestamps";
import { hooks } from "./runIfLatestBuild";

// We want this to be synchronous, so that if it fails we crash the
// application. We should be able to eliminate this if Meteor backports
// support for async startup functions (as requested in
// https://github.com/meteor/meteor/discussions/12468)
const stat = await fs.stat(process.argv[1]!);
const buildTimestamp = stat.mtime;

const previousLatest = await LatestDeploymentTimestamps.findOneAsync("default");
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
