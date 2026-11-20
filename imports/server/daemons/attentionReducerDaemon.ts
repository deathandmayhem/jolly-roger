import { setTimeout as sleep } from "node:timers/promises";
import { Meteor } from "meteor/meteor";
import { NpmModuleMongodb } from "meteor/npm-mongo";
import Flags from "../../Flags";
import Logger from "../../Logger";
import AttentionReducerCheckpoints from "../models/AttentionReducerCheckpoints";
import type { AttentionTransitionType } from "../models/AttentionTransitions";
import AttentionTransitions from "../models/AttentionTransitions";
import withLock, { PREEMPT_TIMEOUT } from "../withLock";
import { applyTransition } from "./attentionReducer";

type InsertEvent =
  NpmModuleMongodb.ChangeStreamInsertDocument<AttentionTransitionType>;
const { MongoErrorLabel, MongoServerError } = NpmModuleMongodb;

const FEATURE_FLAG_NAME = "disable.attention_reducer";

// Max time to wait for a new change stream record before pausing and checking
// for a stop
const CHANGE_STREAM_WAIT_MS =
  Meteor.isTest || Meteor.isAppTest
    ? // Much shorter in tests, which start and stop the reducer a lot
      100
    : 1000;
// How often to save the resume token
const CHECKPOINT_INTERVAL_MS = 5000;

function watchInserts(options: { resumeAfter?: unknown } = {}) {
  return AttentionTransitions.collection
    .rawCollection()
    .watch<AttentionTransitionType, InsertEvent>(
      [{ $match: { operationType: "insert" } }],
      { maxAwaitTimeMS: CHANGE_STREAM_WAIT_MS, ...options },
    );
}

async function saveCheckpoint(resumeToken: unknown): Promise<void> {
  if (resumeToken === undefined || resumeToken === null) {
    return;
  }
  await AttentionReducerCheckpoints.upsertAsync("default", {
    $set: { resumeToken },
  });
}

// The server can't continue the stream (say, the oplog was truncated past it)
function resumeRefused(error: unknown): boolean {
  return (
    error instanceof MongoServerError &&
    !error.hasErrorLabel(MongoErrorLabel.ResumableChangeStreamError)
  );
}

async function rebuildStates(signal: AbortSignal): Promise<void> {
  Logger.info("Rebuilding attention states from the transition log");
  let count = 0;
  for await (const transition of AttentionTransitions.find(
    {},
    { sort: { ts: 1 } },
  )) {
    if (signal.aborted) return;
    await applyTransition(transition);
    count += 1;
  }
  Logger.info("Rebuilt attention states", { count });
}

// Fold the transition log into AttentionStates until `signal` is aborted.
export async function runReducer(signal: AbortSignal): Promise<void> {
  const checkpoint = await AttentionReducerCheckpoints.findOneAsync("default");
  const stream = watchInserts(
    checkpoint ? { resumeAfter: checkpoint.resumeToken } : {},
  );
  try {
    if (!checkpoint) {
      // If there's no checkpoint, we need to rebuild from scratch. Before we
      // start the rebuild, fetch one batch of events from the change stream to
      // establish a checkpoint (then any new events that come in while we're
      // rebuilding will get replayed)
      await stream.tryNext();
      await rebuildStates(signal);
    }

    let token: unknown;
    let savedAt = Date.now();
    while (!signal.aborted) {
      let change: InsertEvent | null;
      try {
        change = await stream.tryNext();
      } catch (error) {
        if (resumeRefused(error)) {
          // Rebuild from scratch on the next attempt
          await AttentionReducerCheckpoints.removeAsync("default");
        }
        throw error;
      }

      if (change) {
        await applyTransition(change.fullDocument);
      }

      // stream.resumeToken only advances when we get an empty batch from the
      // change stream; otherwise we need to take it from the individual change
      // event.
      token = change?._id ?? stream.resumeToken;
      if (Date.now() - savedAt >= CHECKPOINT_INTERVAL_MS) {
        await saveCheckpoint(token);
        savedAt = Date.now();
      }
    }

    await saveCheckpoint(token);
  } finally {
    await stream.close();
  }
}

async function waitUntilEnabled(): Promise<void> {
  const enabled = Promise.withResolvers<void>();
  // The observer reports the flag's current state before this resolves
  const handle = await Flags.observeChangesAsync(
    FEATURE_FLAG_NAME,
    (disabled) => {
      if (!disabled) enabled.resolve();
    },
  );
  try {
    await enabled.promise;
  } finally {
    handle.stop();
  }
}

async function reduceLoop(): Promise<void> {
  while (true) {
    try {
      await waitUntilEnabled();

      await withLock("attention-reducer", async (renew) => {
        using stack = new DisposableStack();

        // Stop if we lose the lock or the reducer gets disabled.
        const stop = new AbortController();
        stack.use(
          setInterval(() => {
            renew().catch(() => stop.abort());
          }, PREEMPT_TIMEOUT / 2),
        );
        const flagHandle = await Flags.observeChangesAsync(
          FEATURE_FLAG_NAME,
          (disabled) => {
            if (disabled) stop.abort();
          },
        );
        stack.defer(() => flagHandle.stop());

        await runReducer(stop.signal);
      });
    } catch (error) {
      Logger.error("Attention reducer daemon failed", { error });
      await sleep(5000);
    }
  }
}

Meteor.startup(() => {
  if (Meteor.isTest || Meteor.isAppTest) {
    return;
  }
  void reduceLoop();
});
