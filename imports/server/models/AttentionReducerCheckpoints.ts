import { z } from "zod";
import type { ModelType } from "../../lib/typedModel/Model";
import Model from "../../lib/typedModel/Model";

// AttentionReducerCheckpoint captures the (opaque) change stream resume token
// for the reducer that incorporates AttentionTransitions into AttentionStates.
// It is a singleton collection, with _id "default".
const AttentionReducerCheckpoint = z.object({
  resumeToken: z.unknown(),
});

const AttentionReducerCheckpoints = new Model(
  "jr_attention_reducer_checkpoints",
  AttentionReducerCheckpoint,
  z.literal("default"),
);
export type AttentionReducerCheckpointType = ModelType<
  typeof AttentionReducerCheckpoints
>;

export default AttentionReducerCheckpoints;
