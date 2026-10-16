import { z } from "zod";
import { AttentionSignal } from "../../lib/engagement/attentionSignals";
import { foreignKey, nonEmptyString } from "../../lib/typedModel/customTypes";
import type { ModelType } from "../../lib/typedModel/Model";
import Model from "../../lib/typedModel/Model";
import { Id } from "../../lib/typedModel/regexes";

// The append-only source of truth for attention; we reduce over this log to
// generate AttentionStates, so rows are never mutated in place (other than by
// merging users or purging hunts).
export const AttentionTransition = z.object({
  user: foreignKey,
  // Absent if on a non-hunt page (the hunt list, /users)
  hunt: foreignKey.optional(),
  // Absent if on a non-puzzle page (above + puzzle list, etc.)
  puzzle: foreignKey.optional(),
  tab: z.string().regex(Id),

  // In an unclean disconnect+reconnect, we might see a close from the old
  // connection after the open from the new one, so having the connection ID
  // lets us disambiguate those
  connection: z.string().regex(Id),

  // The server that received the event, which the dead-server sweep uses to
  // look up a dead server's connections
  server: foreignKey,

  signal: AttentionSignal,
  value: z.boolean(),
  // Note: this is not bucketed like the *Activities models for accurate replay
  ts: z.date(),
  // Client-provided retry key for stability across DDP retries
  dedupKey: nonEmptyString,
});

const AttentionTransitions = new Model(
  "jr_attention_transitions",
  AttentionTransition,
);
// Protects dedupKey uniqueness and also supports queries for merging users
AttentionTransitions.addIndex({ user: 1, dedupKey: 1 }, { unique: true });
// The reducer's rebuild replays the whole log in ts order.
AttentionTransitions.addIndex({ ts: 1 });
AttentionTransitions.addIndex({ hunt: 1, ts: 1 });
// The dead-server sweep reads a server's open events in ts order.
AttentionTransitions.addIndex({ server: 1, ts: 1 });
export type AttentionTransitionType = ModelType<typeof AttentionTransitions>;

export default AttentionTransitions;
