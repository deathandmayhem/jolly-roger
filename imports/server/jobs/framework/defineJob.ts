import { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import type { z } from "zod";
import type TypedJob from "../../../lib/jobs/TypedJob";
import Jobs from "../../../lib/models/Jobs";

type JobContext<
  ResultSchema extends z.ZodType<Record<string, unknown>> | undefined,
> =
  ResultSchema extends z.ZodType<Record<string, unknown>>
    ? {
        signal: AbortSignal;
        setResult: (result: z.input<ResultSchema>) => Promise<void>;
      }
    : { signal: AbortSignal };

interface JobRegistryEntry {
  resultSchema: z.ZodType<Record<string, unknown>> | undefined;
  computeDeleteAfter: (() => Date | undefined) | undefined;
  run: (
    args: Record<string, unknown>,
    context: {
      signal: AbortSignal;
      setResult: (result: Record<string, unknown>) => Promise<void>;
    },
  ) => Promise<void>;
}

const jobRegistry = new Map<string, JobRegistryEntry>();

export default function defineJob<
  ArgsSchema extends z.ZodType<Record<string, unknown>>,
  ResultSchema extends
    | z.ZodType<Record<string, unknown>>
    | undefined = undefined,
>(
  job: TypedJob<ArgsSchema, ResultSchema>,
  options: {
    deleteAfter?: () => Date | undefined;
    run: (
      args: z.output<ArgsSchema>,
      context: JobContext<ResultSchema>,
    ) => Promise<void>;
  },
): { enqueue: (args: z.input<ArgsSchema>) => Promise<string> } {
  if (jobRegistry.has(job.name)) {
    throw new Error(`Job "${job.name}" is already defined`);
  }

  jobRegistry.set(job.name, {
    resultSchema: job.resultSchema,
    computeDeleteAfter: options.deleteAfter,
    run: options.run as JobRegistryEntry["run"],
  });

  return {
    async enqueue(args: z.input<ArgsSchema>): Promise<string> {
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
    },
  };
}

export function getHandler(type: string): JobRegistryEntry | undefined {
  return jobRegistry.get(type);
}
