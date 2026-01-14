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

type TypedMethodCallback<Return extends z.ZodTypeAny> = (
  error: Meteor.Error | null,
  result: z.output<Return> | undefined,
) => void;

class TypedMethod<Args extends z.AnyZodTuple, Return extends z.ZodTypeAny> {
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

  call(
    ...args: [...z.input<Args>, callback?: TypedMethodCallback<Return>]
  ): void {
    let callback: TypedMethodCallback<Return> | undefined;
    if (typeof args.at(-1) === "function") {
      callback = args.pop() as TypedMethodCallback<Return>;
    }

    if (Bugsnag.isStarted()) {
      Bugsnag.leaveBreadcrumb(
        "Meteor method call",
        {
          method: this.name,
          arguments:
            typeof args[0] === "object" ? EJSON.stringify(args[0]) : undefined,
        },
        "request",
      );
    }

    Meteor.call(
      this.name,
      ...args,
      (error: Meteor.Error, result: z.output<Return>) => {
        if (error) {
          const severity =
            error instanceof Meteor.Error &&
            typeof error.error === "number" &&
            error.error >= 400 &&
            error.error < 500
              ? "info"
              : "error";
          Logger[severity](`Meteor method call failed: ${this.name}`, {
            error,
            method: this.name,
            arguments:
              typeof args[0] === "object"
                ? EJSON.stringify(args[0])
                : undefined,
          });
        }
        callback?.(error, result as any);
      },
    );
  }

  async callPromise(...args: z.input<Args>): Promise<z.output<Return>> {
    try {
      if (Bugsnag.isStarted()) {
        Bugsnag.leaveBreadcrumb(
          "Meteor method call",
          {
            method: this.name,
            arguments:
              typeof args[0] === "object"
                ? EJSON.stringify(args[0])
                : undefined,
          },
          "request",
        );
      }
      const result = await Meteor.callAsync(this.name, ...args);
      return result as z.output<Return>;
    } catch (error) {
      if (error) {
        const severity =
          error instanceof Meteor.Error &&
          typeof error.error === "number" &&
          error.error >= 400 &&
          error.error < 500
            ? "info"
            : "error";
        Logger[severity](`Meteor method call failed: ${this.name}`, {
          error,
          method: this.name,
          arguments:
            typeof args[0] === "object" ? EJSON.stringify(args[0]) : undefined,
        });
      }
      throw error;
    }
  }
}

export default TypedMethod;
