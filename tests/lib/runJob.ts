import { DDP } from "meteor/ddp";
import type { z } from "zod";
import type TypedJob from "../../imports/lib/jobs/TypedJob";
import { getHandler } from "../../imports/server/jobs/framework/defineJob";
import enqueueJob from "../../imports/server/jobs/framework/enqueueJob";

export default async function runJob<
  ArgsSchema extends z.ZodType<Record<string, unknown>>,
>(
  job: TypedJob<ArgsSchema, any>,
  args: z.input<ArgsSchema>,
  options?: {
    userId?: string;
    jobId?: string;
    setResult?: (...args: any[]) => Promise<void>;
  },
): Promise<string> {
  const jobId = options?.jobId ?? (await enqueueJob(job, args));
  const handler = getHandler(job.name);
  if (!handler) {
    throw new Error(`Job handler ${job.name} not registered`);
  }
  const controller = new AbortController();
  const run = async () => {
    await handler.run(args as Record<string, unknown>, {
      jobId,
      signal: controller.signal,
      setResult:
        options?.setResult ??
        (async () => {
          /* intentionally empty */
        }),
    });
  };
  await DDP._CurrentMethodInvocation.withValue(
    { userId: options?.userId ?? null },
    run,
  );
  return jobId;
}
