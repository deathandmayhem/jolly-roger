import { z } from "zod";
import { foreignKey } from "../../lib/typedModel/customTypes";
import type { ModelType } from "../../lib/typedModel/Model";
import Model from "../../lib/typedModel/Model";

const CallActivity = z.object({
  ts: z.date(),
  hunt: foreignKey,
  call: foreignKey,
  user: foreignKey,
});

const CallActivities = new Model("jr_call_activities", CallActivity);
CallActivities.addIndex(
  {
    ts: 1,
    call: 1,
    user: 1,
  },
  { unique: true },
);
CallActivities.addIndex({
  hunt: 1,
  ts: 1,
});
export type CallActivityType = ModelType<typeof CallActivities>;

export default CallActivities;
