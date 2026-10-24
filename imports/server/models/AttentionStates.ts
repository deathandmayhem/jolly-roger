import { z } from "zod";
import { foreignKey } from "../../lib/typedModel/customTypes";
import type { ModelType } from "../../lib/typedModel/Model";
import Model from "../../lib/typedModel/Model";
import { Id } from "../../lib/typedModel/regexes";

const signalState = z.object({
  value: z.boolean(),
  changedAt: z.date(),
});

// One record per currently live connection, written (modulo exceptional cases
// like merging users) only by the reducer from AttentionTransitions
export const AttentionState = z.object({
  user: foreignKey,
  tab: z.string().regex(Id),
  connection: z.string().regex(Id),

  // When this tab arrived at its current hunt/puzzle
  arrivedAt: z.date(),

  // Absent if on a non-hunt page (the hunt list, /users)
  hunt: foreignKey.optional(),
  // Absent if on a non-puzzle page (above + puzzle list, etc.)
  puzzle: foreignKey.optional(),

  // absent until first reported: "unknown", distinct from false.
  tabVisible: signalState.optional(),
  windowFocused: signalState.optional(),
  iframeFocused: signalState.optional(),

  // Client-reported: whether operator mode is enabled in this tab.
  operating: z.boolean().optional(),
});

const AttentionStates = new Model("jr_attention_states", AttentionState);
// One record per (user, connection, tab)
AttentionStates.addIndex({ user: 1, connection: 1, tab: 1 }, { unique: true });
export type AttentionStateType = ModelType<typeof AttentionStates>;

export default AttentionStates;
