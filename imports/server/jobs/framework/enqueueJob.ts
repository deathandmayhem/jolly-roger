import { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import type { z } from "zod";
import type TypedJob from "../../../lib/jobs/TypedJob";
import Jobs from "../../../lib/models/Jobs";

export default function enqueueJob<
  ArgsSchema extends z.ZodType<Record<string, unknown>>,
  ResultSchema extends
    | z.ZodType<Record<string, unknown>>
    | undefined = undefined,
>(
  job: TypedJob<ArgsSchema, ResultSchema>,
  args: z.input<ArgsSchema>,
): Promise<string> {
  const parsed = job.argsSchema.parse(args);
  let createdBy: string | undefined;
  if (
    DDP._CurrentMethodInvocation.get() ||
    DDP._CurrentPublicationInvocation.get()
  ) {
    createdBy = Meteor.userId() ?? undefined;
  }
  return Jobs.insertAsync({
    type: job.name,
    args: parsed,
    status: "pending" as const,
    attempts: 0,
    maxAttempts: job.maxAttempts,
    ...(createdBy ? { createdBy } : {}),
  });
}
