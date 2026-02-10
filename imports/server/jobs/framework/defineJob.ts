import { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import type { z } from "zod";
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
  name: string,
  argsSchema: ArgsSchema,
  options: {
    result?: ResultSchema;
    maxAttempts?: number;
    deleteAfter?: () => Date | undefined;
    run: (
      args: z.output<ArgsSchema>,
      context: JobContext<ResultSchema>,
    ) => Promise<void>;
  },
): { enqueue: (args: z.input<ArgsSchema>) => Promise<string> } {
  if (jobRegistry.has(name)) {
    throw new Error(`Job "${name}" is already defined`);
  }

  const maxAttempts = options.maxAttempts ?? 1;

  jobRegistry.set(name, {
    resultSchema: options.result,
    computeDeleteAfter: options.deleteAfter,
    run: options.run as JobRegistryEntry["run"],
  });

  return {
    async enqueue(args: z.input<ArgsSchema>): Promise<string> {
      const parsed = argsSchema.parse(args);
      let createdBy: string | undefined;
      if (
        DDP._CurrentMethodInvocation.get() ||
        DDP._CurrentPublicationInvocation.get()
      ) {
        createdBy = Meteor.userId() ?? undefined;
      }
      return Jobs.insertAsync({
        type: name,
        args: parsed,
        status: "pending" as const,
        attempts: 0,
        maxAttempts,
        ...(createdBy ? { createdBy } : {}),
      });
    },
  };
}

export function getHandler(type: string): JobRegistryEntry | undefined {
  return jobRegistry.get(type);
}
