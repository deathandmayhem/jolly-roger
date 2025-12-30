import { z } from "zod";
import { nonEmptyString } from "../../lib/models/customTypes";
import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";
import withTimestamps from "../../lib/models/withTimestamps";

// LatestDeploymentTimestamp captures the most recent build timestamp that we've
// observed, and is used to prevent older builds from accidentally warring over
// newer changes. It is a singleton collection with _id "default"
const LatestDeploymentTimestamp = withTimestamps(
  z.object({
    buildTimestamp: z.date(),
    gitRevision: nonEmptyString,
  }),
);

const LatestDeploymentTimestamps = new Model(
  "jr_latest_deployment_timestamps",
  LatestDeploymentTimestamp,
  z.literal("default"),
);
export type LatestDeploymentTimestampType = ModelType<
  typeof LatestDeploymentTimestamps
>;
export default LatestDeploymentTimestamps;
