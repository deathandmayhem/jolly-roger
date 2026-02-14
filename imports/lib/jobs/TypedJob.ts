import type { z } from "zod";

class TypedJob<
  ArgsSchema extends z.ZodType<Record<string, unknown>>,
  ResultSchema extends
    | z.ZodType<Record<string, unknown>>
    | undefined = undefined,
> {
  name: string;

  argsSchema: ArgsSchema;

  resultSchema: ResultSchema;

  maxAttempts: number;

  constructor(
    name: string,
    argsSchema: ArgsSchema,
    options?: { result?: ResultSchema; maxAttempts?: number },
  ) {
    this.name = name;
    this.argsSchema = argsSchema;
    this.resultSchema = options?.result as ResultSchema;
    this.maxAttempts = options?.maxAttempts ?? 1;
  }
}

export type TypedJobArgsType<J> =
  J extends TypedJob<infer A, any> ? z.output<A> : never;

export type TypedJobResultType<J> =
  J extends TypedJob<any, infer R>
    ? R extends z.ZodType<Record<string, unknown>>
      ? z.output<R>
      : undefined
    : never;

export default TypedJob;
