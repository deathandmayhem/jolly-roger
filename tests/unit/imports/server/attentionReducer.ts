import { Random } from "meteor/random";
import { assert } from "chai";
import type { AttentionStateSignalType } from "../../../../imports/lib/engagement/attentionSignals";
import { applyTransition } from "../../../../imports/server/daemons/attentionReducer";
import AttentionStates from "../../../../imports/server/models/AttentionStates";
import resetDatabase from "../../../lib/resetDatabase";

interface Key {
  user: string;
  connection: string;
  tab: string;
}

function key(): Key {
  return {
    user: Random.id(),
    connection: Random.id(),
    tab: Random.id(),
  };
}

function open(
  k: Key,
  ts: Date,
  context: { hunt?: string; puzzle?: string } = {},
) {
  return applyTransition({ ...k, signal: "context", ts, ...context });
}

function signal(k: Key, s: AttentionStateSignalType, value: boolean, ts: Date) {
  return applyTransition({ ...k, signal: s, value, ts });
}

function stateFor(k: Key) {
  return AttentionStates.findOneAsync({
    user: k.user,
    connection: k.connection,
    tab: k.tab,
  });
}

describe("attention reducer fold", function () {
  beforeEach(async function () {
    await resetDatabase("attention reducer");
  });

  it("does not bump arrivedAt on repeated events (e.g. reconnection)", async function () {
    const k = key();
    const hunt = Random.id();
    const first = new Date(2026, 0, 1);
    await open(k, first, { hunt });
    await open(k, new Date(2026, 0, 2), { hunt });

    const record = await stateFor(k);
    assert.isDefined(record);
    assert.equal(record.arrivedAt.getTime(), first.getTime());
  });

  it("applies signals, without bumping changedAt when one repeats its current value", async function () {
    const k = key();
    const flipped = new Date(2026, 0, 2);
    await open(k, new Date(2026, 0, 1));
    await signal(k, "windowFocused", true, flipped);
    await signal(k, "windowFocused", true, new Date(2026, 0, 3));

    const record = await stateFor(k);
    assert.isDefined(record);
    const focus = record.windowFocused;
    assert.isDefined(focus);
    assert.isTrue(focus.value);
    assert.equal(focus.changedAt.getTime(), flipped.getTime());
  });

  it("bumps arrivedAt, adjusts context, preserves signals on navigation", async function () {
    const k = key();
    const from = Random.id();
    const to = Random.id();
    const arrived = new Date(2026, 0, 3);
    await open(k, new Date(2026, 0, 1), { puzzle: from });
    await signal(k, "tabVisible", true, new Date(2026, 0, 2));
    await open(k, arrived, { puzzle: to });

    const record = await stateFor(k);
    assert.isDefined(record);
    assert.equal(record.puzzle, to);
    assert.equal(record.arrivedAt.getTime(), arrived.getTime());
    assert.isTrue(record.tabVisible?.value);
  });

  it("drops a signal reported before the tab opens", async function () {
    const k = key();
    await signal(k, "tabVisible", true, new Date(2026, 0, 1));

    assert.isUndefined(await stateFor(k));
  });

  it("converges to the same state when a sequence is replayed", async function () {
    const k = key();
    const from = Random.id();
    const to = Random.id();
    const replay = async () => {
      await open(k, new Date(2026, 0, 1), { puzzle: from });
      await signal(k, "tabVisible", true, new Date(2026, 0, 2));
      await open(k, new Date(2026, 0, 3), { puzzle: to });
      await signal(k, "iframeFocused", true, new Date(2026, 0, 4));
    };

    await replay();
    const once = await stateFor(k);
    await replay();
    const twice = await stateFor(k);

    assert.deepEqual(twice, once);
  });
});
