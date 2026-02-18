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
    options: {
      args: ArgsSchema;
      resultSchema?: ResultSchema;
      maxAttempts?: number;
    },
  ) {
    this.name = name;
    this.argsSchema = options.args;
    this.resultSchema = options.resultSchema ?? (undefined as ResultSchema);
    this.maxAttempts = options.maxAttempts ?? 1;
  }
}

export type TypedJobResult<J> =
  J extends TypedJob<any, infer R>
    ? R extends z.ZodType<Record<string, unknown>>
      ? z.output<R>
      : never
    : never;

export default TypedJob;
