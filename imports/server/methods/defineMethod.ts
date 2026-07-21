import { check, Match } from "meteor/check";
import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import Bugsnag from "@bugsnag/js";
import type z from "zod";
import { ZodError } from "zod";
import type TypedMethod from "../../methods/TypedMethod";

export default function defineMethod<
  Args extends z.AnyZodTuple,
  Return extends z.ZodTypeAny,
>(
  method: TypedMethod<Args, Return>,
  {
    run,
  }: {
    run: (
      this: Meteor.MethodThisType,
      ...args: z.output<Args>
    ) => z.input<Return> | Promise<z.input<Return>>;
  },
) {
  Meteor.methods({
    async [method.name](...args: unknown[]) {
      // Silence audit-argument-checks; we'll do our own validation below.
      check(args, [Match.Any]);

      try {
        const validatedArgs = await method.args
          .parseAsync(args)
          .catch((error: unknown) => {
            // Attach a sanitized error to get serialized over DDP, but keep the
            // original error for server-side reporting.
            if (error instanceof ZodError) {
              (
                error as ZodError & { sanitizedError?: Meteor.Error }
              ).sanitizedError = new Meteor.Error(
                400,
                `Invalid arguments to method ${method.name}`,
              );
            }
            throw error;
          });
        const result = await run.apply(this, validatedArgs);
        // (Don't sanitize - a badly formatted return value is a server bug)
        return await method.return.parseAsync(result);
      } catch (error) {
        if (error instanceof Error && Bugsnag.isStarted()) {
          // Attempt to classify severity based on the following rules:
          // - If the error has a `sanitizedError` property, look at that
          //   instead of the error itself
          // - If the error is a Meteor.Error and error.error is a number
          //   between 400 and 499, it's info severity
          // - Otherwise, it's error severity
          const sanitizedError = (error as any).sanitizedError ?? error;
          const severity =
            sanitizedError instanceof Meteor.Error &&
            typeof sanitizedError.error === "number" &&
            sanitizedError.error >= 400 &&
            sanitizedError.error < 500
              ? "info"
              : "error";

          Bugsnag.notify(error, (event) => {
            event.context = method.name;
            event.severity = severity;
            event.addMetadata("method", {
              arguments: EJSON.stringify({ args }),
            });
          });
        }
        throw error;
      }
    },
  });
}
