import { setTimeout } from "node:timers/promises";
import { DDP } from "meteor/ddp";
import { Random } from "meteor/random";
import { assert } from "chai";
import FeatureFlags from "../../../../imports/lib/models/FeatureFlags";
import Servers from "../../../../imports/lib/models/Servers";
import reportAttentionContext from "../../../../imports/methods/reportAttentionContext";
import reportAttentionTransition from "../../../../imports/methods/reportAttentionTransition";
import {
  appendContext,
  closeConnection,
  markConnection,
  untrackConnection,
} from "../../../../imports/server/attentionLog";
import { cleanupDeadServer } from "../../../../imports/server/garbage-collection";
import AttentionTransitions from "../../../../imports/server/models/AttentionTransitions";
import resetDatabase from "../../../lib/resetDatabase";
import waitForAssertion from "../../../lib/waitForAssertion";
import withWriteFence from "../../../lib/withWriteFence";

// For markers whose context event has already been written
const written = Promise.resolve();

function key() {
  return { user: Random.id(), connection: Random.id(), tab: Random.id() };
}

function rowsFor(user: string) {
  return AttentionTransitions.find({ user }).fetchAsync();
}

async function eventsFor(user: string) {
  return (await rowsFor(user))
    .map((row) => ("value" in row ? `${row.signal}:${row.value}` : row.signal))
    .toSorted();
}

function setReportingDisabled(disabled: boolean) {
  return withWriteFence(async () => {
    await FeatureFlags.upsertAsync(
      { name: "disable.attention_reporting" },
      { $set: { type: disabled ? "on" : "off", createdBy: Random.id() } },
    );
  });
}

interface FakeConnection {
  id: string;
  onClose(callback: () => void): void;
}

// Report a tab's context and one signal through the methods. (Meteor.callAsync
// on the server inherits the connection from the enclosing method invocation)
function reportAs(user: string, connection: FakeConnection, tab: string) {
  const invocation = { userId: user, connection };
  return DDP._CurrentMethodInvocation.withValue(invocation, async () => {
    await reportAttentionContext.callPromise({ tab, dedupKey: Random.id() });
    await reportAttentionTransition.callPromise({
      tab,
      signal: "tabVisible",
      value: true,
      dedupKey: Random.id(),
    });
  });
}

function insertTransition(
  k: ReturnType<typeof key>,
  server: string,
  signal: "context" | "close",
  ts: Date,
) {
  return AttentionTransitions.insertAsync({
    ...k,
    server,
    signal,
    ts,
    dedupKey: signal === "close" ? `${k.connection}:close` : Random.id(),
  });
}

function closesFor(k: ReturnType<typeof key>) {
  return AttentionTransitions.find({
    connection: k.connection,
    signal: "close",
  }).fetchAsync();
}

describe("attention log", function () {
  beforeEach(async function () {
    await resetDatabase("attention log");
  });

  it("does not duplicate a report replayed with the same dedupKey", async function () {
    const k = key();
    await appendContext(k, {}, "dk1", new Date());
    await appendContext(k, {}, "dk1", new Date());

    assert.lengthOf(await rowsFor(k.user), 1);
  });

  it("appends the disconnect close after the context event, if that's still being written", async function () {
    const user = Random.id();
    const connection = {
      id: Random.id(),
      onClose() {
        // unused: the test closes the connection itself
      },
    };
    const contextWrite = Promise.withResolvers<void>();
    markConnection(connection, {
      user,
      tab: Random.id(),
      written: contextWrite.promise,
    });

    const closing = closeConnection(connection);
    const closedEarly = await Promise.race([
      closing.then(() => true),
      setTimeout(100).then(() => false),
    ]);
    assert.isFalse(closedEarly);
    contextWrite.resolve();
    await closing;
    assert.deepEqual(await eventsFor(user), ["close"]);
  });

  it("drops reports from a connection that has already closed", async function () {
    const user = Random.id();
    const tab = Random.id();
    const closeCallbacks: (() => void)[] = [];
    const connection = {
      id: Random.id(),
      onClose(callback: () => void) {
        closeCallbacks.push(callback);
      },
    };

    await reportAs(user, connection, tab);
    for (const callback of closeCallbacks) callback();
    const closed = ["close", "context", "tabVisible:true"];
    await waitForAssertion(async () => {
      assert.deepEqual(await eventsFor(user), closed);
    });

    // A report that was still in flight when the connection closed
    await reportAs(user, connection, tab);
    assert.deepEqual(await eventsFor(user), closed);
  });

  it("closes the tab on logout, and the tab reported after it on disconnect", async function () {
    const user = Random.id();
    const loggedOutTab = Random.id();
    const loggedInTab = Random.id();
    const connection = {
      id: Random.id(),
      onClose() {
        // unused: the test closes the connection itself
      },
    };

    markConnection(connection, { user, tab: loggedOutTab, written });
    const loggingOut = untrackConnection(connection, "logout");
    // The same user logs back in on the same connection before the logout close
    // has been written
    markConnection(connection, { user, tab: loggedInTab, written });
    await loggingOut;
    await closeConnection(connection);

    const closes = (await rowsFor(user)).filter(
      (row) => row.signal === "close",
    );
    assert.sameMembers(
      closes.map((row) => row.tab),
      [loggedOutTab, loggedInTab],
    );
  });

  it("closes each connection still open on a dead server", async function () {
    const deadServer = Random.id();
    const now = new Date();
    await Servers.insertAsync({
      _id: deadServer,
      hostname: "dead",
      pid: 1,
      createdAt: now,
      updatedAt: now,
    });

    const navigated = key();
    const day1 = new Date(2026, 0, 1);
    const day2 = new Date(2026, 0, 2);
    await insertTransition(navigated, deadServer, "context", day1);
    await insertTransition(navigated, deadServer, "context", day2);
    const closed = key();
    await insertTransition(closed, deadServer, "context", day1);
    await insertTransition(closed, deadServer, "close", day2);
    const elsewhere = key();
    await insertTransition(elsewhere, Random.id(), "context", day1);

    await cleanupDeadServer(deadServer);

    assert.lengthOf(await closesFor(navigated), 1);
    assert.lengthOf(await closesFor(closed), 1);
    assert.lengthOf(await closesFor(elsewhere), 0);
  });

  describe("circuit breaker", function () {
    afterEach(async function () {
      await setReportingDisabled(false);
    });

    it("closes every reported tab when turned on, and discards reports until turned off", async function () {
      const user = Random.id();
      const tab = Random.id();
      const connection = {
        id: Random.id(),
        onClose() {
          // unused: the test closes the connection itself
        },
      };
      const report = () => reportAs(user, connection, tab);

      await report();
      await setReportingDisabled(true);
      const closed = ["close", "context", "tabVisible:true"];
      await waitForAssertion(async () => {
        assert.deepEqual(await eventsFor(user), closed);
      });

      await report();
      assert.deepEqual(await eventsFor(user), closed);

      // Reopened, and closed again on disconnect
      await setReportingDisabled(false);
      await report();
      await closeConnection(connection);
      assert.deepEqual(await eventsFor(user), [
        "close",
        "close",
        "context",
        "context",
        "tabVisible:true",
        "tabVisible:true",
      ]);
    });
  });
});
