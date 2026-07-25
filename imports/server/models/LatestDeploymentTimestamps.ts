import { z } from "zod";
import { nonEmptyString } from "../../lib/typedModel/customTypes";
import type { ModelType } from "../../lib/typedModel/Model";
import Model from "../../lib/typedModel/Model";
import withTimestamps from "../../lib/typedModel/withTimestamps";

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
