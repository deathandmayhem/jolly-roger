import { z } from "zod";

import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";

// DriveActivityLatest captures the most recent timestamp we've seen from the
// Google Drive Activity API. It is a singleton collection, with _id "default"
const DriveActivityLatest = z.object({
  ts: z.date(),
});

const DriveActivityLatests = new Model(
  "jr_drive_activity_latests",
  DriveActivityLatest,
  z.literal("default"),
);
export type DriveActivityLatestType = ModelType<typeof DriveActivityLatests>;

export default DriveActivityLatests;
