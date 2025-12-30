import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import Bugsnag from "@bugsnag/js";
import type TypedMethod from "../../methods/TypedMethod";
import type {
  TypedMethodArgs,
  TypedMethodParam,
} from "../../methods/TypedMethod";

type TypedMethodValidator<Arg extends TypedMethodArgs> = (
  this: Meteor.MethodThisType,
  arg0: unknown,
) => Arg;
type TypedMethodRun<
  Arg extends TypedMethodArgs,
  Return extends TypedMethodParam | void,
> = Arg extends void
  ? (this: Meteor.MethodThisType) => Return | Promise<Return>
  : (this: Meteor.MethodThisType, arg0: Arg) => Return | Promise<Return>;

const voidValidator = () => {
  /* noop */
};

// Supporting methods with no (void) arguments is a bit messy, but comes up
// often enough that it's worth doing properly. With no arguments, the type
// system doesn't accept a validator. However, there's no way to access type
// information at runtime, so when no validator is provided, we substitute
// `voidValidator` at runtime (which explicitly discards any arguments, ensuring
// that they aren't passed through to the `run` implementation).
//
// Ideally we'd declare the `validate` method in a way that it is absent for
// void and present for non-void and subsequently check for the presence/absence
// to hint to the type system whether or not we were dealing with a void method,
// but I wasn't able to get the type system to make inference in that direction
// (that the absence of a validate method implied void arguments), which just
// made everything more awkward.
export default function defineMethod<
  Args extends TypedMethodArgs,
  Return extends TypedMethodParam | void,
>(
  method: TypedMethod<Args, Return>,
  {
    validate,
    run,
  }: {
    run: TypedMethodRun<Args, Return>;
  } & (Args extends void
    ? { validate?: undefined }
    : { validate: TypedMethodValidator<Args> }),
) {
  const validator = (validate ?? voidValidator) as TypedMethodValidator<Args>;

  Meteor.methods({
    async [method.name](arg0: Args) {
      try {
        // In the case of no arguments, the type system will track the return
        // value from `validate` as `void`, but because it's a function that
        // doesn't return anything, it will in practice be `undefined`.
        const validatedArgs = validator.bind(this)(arg0) as any;
        return await run.bind(this)(validatedArgs);
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
              arguments: EJSON.stringify(arg0 ?? {}),
            });
          });
        }
        throw error;
      }
    },
  });
}
