import { z } from "zod";
import { foreignKey } from "../customTypes";
import type { ModelType } from "../Model";
import Model from "../Model";

// Don't use the BaseCodec here - unlike most database objects, this isn't
// manipulated by users, so many of the fields don't make sense
const CallHistory = z.object({
  hunt: foreignKey,
  call: foreignKey,
  lastActivity: z.date(),
});

const CallHistories = new Model("jr_mediasoup_call_histories", CallHistory);
CallHistories.addIndex({ call: 1 }, { unique: true });
CallHistories.addIndex({ hunt: 1 });
export type CallHistoryType = ModelType<typeof CallHistories>;

export default CallHistories;
