import { z } from "zod";
import { foreignKey } from "./customTypes";
import type { ModelType } from "./Model";
import Model from "./Model";

/* DocumentActivityFields doesn't inherit from Base because it's created by the
   server, not by users */
export const DocumentActivity = z.object({
  ts: z.date() /* rounded to ACTIVITY_GRANULARITY */,
  hunt: foreignKey,
  puzzle: foreignKey,
  document: foreignKey,
  // user can be undefined if we aren't able to match an activity record back to
  // a Jolly Roger user (e.g. because they haven't linked their Google Account)
  user: foreignKey.optional(),
});

const DocumentActivities = new Model(
  "jr_document_activities",
  DocumentActivity,
);
DocumentActivities.addIndex({ hunt: 1 });
DocumentActivities.addIndex(
  {
    document: 1,
    ts: 1,
    user: 1,
  },
  { unique: true },
);
export type DocumentActivityType = ModelType<typeof DocumentActivities>;

export default DocumentActivities;
