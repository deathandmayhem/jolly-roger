import { EventEmitter } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import Logger from "../../../Logger";
import Jobs, { type JobType } from "../../../lib/models/Jobs";
import { registerPeriodicCleanupHook } from "../../garbage-collection";
import onExit from "../../onExit";
import serverId from "../../serverId";
import { getHandler } from "./defineJob";

interface WorkerEvents {
  wake: [];
}

const emitter = new EventEmitter<WorkerEvents>();
const abortController = new AbortController();

async function claimJob() {
  const now = new Date();
  const result = await Jobs.collection.rawCollection().findOneAndUpdate(
    {
      status: "pending",
      runAfter: { $not: { $gt: now } },
    },
    {
      $set: {
        status: "running",
        claimedBy: serverId,
        claimedAt: now,
      },
      $inc: { attempts: 1 },
    },
    {
      sort: { runAfter: 1, createdAt: 1 },
      returnDocument: "after",
    },
  );

  return result ?? undefined;
}

async function processJob(job: JobType, signal: AbortSignal) {
  const entry = getHandler(job.type);
  if (!entry) {
    Logger.error("No handler registered for job type", { type: job.type });
    await Jobs.updateAsync(job._id, {
      $set: {
        status: "failed" as const,
        completedAt: new Date(),
        error: `No handler registered for job type "${job.type}"`,
      },
      $unset: { claimedBy: "", claimedAt: "" },
    });
    return;
  }

  const setResult = async (result: Record<string, unknown>) => {
    const parsed = entry.resultSchema
      ? entry.resultSchema.parse(result)
      : result;
    await Jobs.updateAsync(job._id, { $set: { result: parsed } });
  };
  const context = { signal, setResult };
  const runHandler = () => entry.run(job.args, context);
  try {
    await (job.createdBy
      ? DDP._CurrentInvocation.withValue({ userId: job.createdBy }, runHandler)
      : runHandler());
    const deleteAfter = entry.computeDeleteAfter?.();
    await Jobs.updateAsync(job._id, {
      $set: {
        status: "completed" as const,
        completedAt: new Date(),
        ...(deleteAfter ? { deleteAfter } : {}),
      },
      $unset: { claimedBy: "", claimedAt: "" },
    });
  } catch (error) {
    const hasRetriesLeft = job.attempts < job.maxAttempts;
    if (hasRetriesLeft) {
      const backoffMs = Math.min(job.attempts ** 2 * 5000, 300000);
      const runAfter = new Date(Date.now() + backoffMs);
      Logger.warn("Job failed, scheduling retry", {
        jobId: job._id,
        type: job.type,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        runAfter,
        error,
      });
      await Jobs.updateAsync(job._id, {
        $set: {
          status: "pending" as const,
          runAfter,
        },
        $unset: { claimedBy: "", claimedAt: "", result: "" },
      });
    } else {
      Logger.error("Job failed, no retries remaining", {
        jobId: job._id,
        type: job.type,
        attempts: job.attempts,
        error,
      });
      await Jobs.updateAsync(job._id, {
        $set: {
          status: "failed" as const,
          completedAt: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        },
        $unset: { claimedBy: "", claimedAt: "" },
      });
    }
  }
}

// Wait for a wake event, abort signal, or poll timeout, cleaning up all
// listeners when any one fires.
function waitForWork(signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const done = () => {
      emitter.off("wake", done);
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, 15000);
    emitter.on("wake", done);
    signal.addEventListener("abort", done, { once: true });
  });
}

async function runWorker(signal: AbortSignal) {
  // Observe new pending jobs for immediate wakeup
  const handle = await Jobs.find({ status: "pending" }).observeChangesAsync({
    added() {
      emitter.emit("wake");
    },
  });

  try {
    while (!signal.aborted) {
      try {
        const job = await claimJob();
        if (job) {
          await processJob(job, signal);
          // Immediately loop to check for more work
          continue;
        }
      } catch (error) {
        Logger.error("Job worker encountered an error", { error });
        // Sleep before retrying to avoid tight error loops
        await sleep(5000);
        continue;
      }

      // No work available — wait for observer notification or poll timeout
      await waitForWork(signal);
    }
  } finally {
    handle.stop();
  }
}

registerPeriodicCleanupHook(async (deadServerId) => {
  // Reset retriable jobs
  await Jobs.updateAsync(
    {
      claimedBy: deadServerId,
      status: "running",
      $expr: { $lt: ["$attempts", "$maxAttempts"] },
    },
    {
      $set: { status: "pending" as const },
      $unset: { claimedBy: "", claimedAt: "", result: "" },
    },
    { multi: true },
  );
  // Fail exhausted jobs
  await Jobs.updateAsync(
    {
      claimedBy: deadServerId,
      status: "running",
      $expr: { $gte: ["$attempts", "$maxAttempts"] },
    },
    {
      $set: {
        status: "failed" as const,
        completedAt: new Date(),
        error: "Server died while processing job",
      },
      $unset: { claimedBy: "", claimedAt: "" },
    },
    { multi: true },
  );
});

if (!Meteor.isTest && !Meteor.isAppTest) {
  Meteor.startup(() => {
    onExit(() => abortController.abort());
    runWorker(abortController.signal).catch((error) => {
      Logger.error("Job worker crashed", { error });
    });
  });
}
