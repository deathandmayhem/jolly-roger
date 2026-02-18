import type { z } from "zod";
import type TypedJob from "../../../lib/jobs/TypedJob";

type JobContext<
  ResultSchema extends z.ZodType<Record<string, unknown>> | undefined,
> =
  ResultSchema extends z.ZodType<Record<string, unknown>>
    ? {
        jobId: string;
        signal: AbortSignal;
        setResult: (result: z.input<ResultSchema>) => Promise<void>;
      }
    : { jobId: string; signal: AbortSignal };

interface JobRegistryEntry {
  resultSchema: z.ZodType<Record<string, unknown>> | undefined;
  computeDeleteAfter: (() => Date | undefined) | undefined;
  run: (
    args: Record<string, unknown>,
    context: {
      jobId: string;
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
): void {
  const { name, resultSchema } = job;

  if (jobRegistry.has(name)) {
    throw new Error(`Job "${name}" is already defined`);
  }

  jobRegistry.set(name, {
    resultSchema,
    computeDeleteAfter: options.deleteAfter,
    run: options.run as JobRegistryEntry["run"],
  });
}

export function getHandler(type: string): JobRegistryEntry | undefined {
  return jobRegistry.get(type);
}
