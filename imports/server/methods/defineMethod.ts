import Bugsnag from "@bugsnag/js";
import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import type z from "zod";
import type TypedMethod from "../../methods/TypedMethod";

export default function defineMethod<
  Args extends z.ZodTuple<any, any>,
  Return extends z.ZodTypeAny,
>(
  method: TypedMethod<Args, Return>,
  {
    run,
  }: {
    run: (
      this: Meteor.MethodThisType,
      ...args: z.infer<Args>
    ) => z.infer<Return> | Promise<z.infer<Return>>;
  },
) {
  Meteor.methods({
    async [method.name](...args: z.infer<Args>) {
      try {
        const validatedArgs = await method.args.parseAsync(args);
        const result = await run.apply(this, validatedArgs);
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
