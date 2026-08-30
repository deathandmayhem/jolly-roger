import { check } from "meteor/check";
import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import Bugsnag from "@bugsnag/js";
import type z from "zod";
import Logger from "../Logger";
import type {
  ValidateEJSONableArgs,
  ValidateEJSONableReturn,
} from "../lib/ValidateEJSONable";
import type { ExactCallArgs } from "../lib/ValidateShape";

type TypedMethodCallback<Return extends z.ZodType> =
  z.output<Return> extends void
    ? (error: Meteor.Error | undefined) => void
    : (
        error: Meteor.Error | undefined,
        result: z.output<Return> | undefined,
      ) => void;

// EJSON.stringify only accepts objects, so wrap rather than passing the array.
const describeArgs = (args: unknown[]) => EJSON.stringify({ args });

const severityFor = (error: unknown) =>
  error instanceof Meteor.Error &&
  typeof error.error === "number" &&
  error.error >= 400 &&
  error.error < 500
    ? "info"
    : "error";

class TypedMethod<Args extends z.ZodTuple, Return extends z.ZodType> {
  name: string;
  args: Args;
  return: Return;

  constructor(
    name: string,
    args: ValidateEJSONableArgs<Args>,
    returnType: ValidateEJSONableReturn<Return>,
  ) {
    check(name, String);

    this.name = name;
    this.args = args;
    this.return = returnType;
  }

  private breadcrumb(args: unknown[]) {
    if (Bugsnag.isStarted()) {
      Bugsnag.leaveBreadcrumb(
        "Meteor method call",
        { method: this.name, arguments: describeArgs(args) },
        "request",
      );
    }
  }

  private logError(error: unknown, args: unknown[]) {
    Logger[severityFor(error)](`Meteor method call failed: ${this.name}`, {
      error,
      method: this.name,
      arguments: describeArgs(args),
    });
  }

  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T must remain independently inferred so ExactCallArgs can reject excess properties
  call<T extends z.input<Args>>(
    ...args: [
      ...ExactCallArgs<T, z.input<Args>>,
      callback?: TypedMethodCallback<Return>,
    ]
  ): void {
    let callback: TypedMethodCallback<Return> | undefined;
    if (typeof args.at(-1) === "function") {
      callback = args.pop() as TypedMethodCallback<Return>;
    }

    this.breadcrumb(args);

    Meteor.call(
      this.name,
      ...args,
      (error: Meteor.Error | undefined, result: z.output<Return>) => {
        if (error) {
          this.logError(error, args);
        }
        callback?.(error, result);
      },
    );
  }

  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T must remain independently inferred so ExactCallArgs can reject excess properties
  async callPromise<T extends z.input<Args>>(
    ...args: ExactCallArgs<T, z.input<Args>>
  ): Promise<z.output<Return>> {
    this.breadcrumb(args);

    try {
      const result = await Meteor.callAsync(this.name, ...args);
      return result as z.output<Return>;
    } catch (error) {
      this.logError(error, args);
      throw error;
    }
  }
}

export default TypedMethod;
