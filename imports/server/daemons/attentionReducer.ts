import AttentionStates from "../models/AttentionStates";
import type { AttentionTransitionType } from "../models/AttentionTransitions";

type FoldInput = Pick<
  AttentionTransitionType,
  "user" | "connection" | "tab" | "hunt" | "puzzle" | "signal" | "value" | "ts"
>;

export async function applyTransition(t: FoldInput): Promise<void> {
  const selector = { user: t.user, connection: t.connection, tab: t.tab };

  if (t.signal !== "open") {
    // Update in place, never upsert, so that a signal reported before the tab's
    // open (when there's no record yet) gets dropped. Skip repeats of the
    // current value (e.g. after a reconnect) so that changedAt stays put.
    await AttentionStates.updateAsync(
      { ...selector, [`${t.signal}.value`]: { $ne: t.value } },
      { $set: { [t.signal]: { value: t.value, changedAt: t.ts } } },
    );
    return;
  }

  // t.signal is "open" so if t.value is false, the tab was closed
  if (!t.value) {
    await AttentionStates.removeAsync(selector);
    return;
  }

  // open:true event, so either a newly opened tab or a navigation.

  const existing = await AttentionStates.findOneAsync(selector);
  if (!existing) {
    await AttentionStates.insertAsync({
      user: t.user,
      connection: t.connection,
      tab: t.tab,
      arrivedAt: t.ts,
      ...(t.hunt !== undefined ? { hunt: t.hunt } : {}),
      ...(t.puzzle !== undefined ? { puzzle: t.puzzle } : {}),
    });
    return;
  }

  if (existing.hunt === t.hunt && existing.puzzle === t.puzzle) {
    // A re-open of the same context (e.g. a reconnect) is not new activity, so
    // leave arrivedAt.
    return;
  }

  // This is navigation. Update the context and bump arrivedAt.
  const $set: Record<string, unknown> = { arrivedAt: t.ts };
  const $unset: Record<string, ""> = {};
  if (t.hunt !== undefined) $set.hunt = t.hunt;
  else $unset.hunt = "";
  if (t.puzzle !== undefined) $set.puzzle = t.puzzle;
  else $unset.puzzle = "";
  await AttentionStates.updateAsync(
    selector,
    Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
  );
}
