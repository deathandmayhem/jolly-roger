import Bugsnag from "@bugsnag/js";
import { check } from "meteor/check";
import { EJSON, type EJSONable, type EJSONableProperty } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import type z from "zod";
import Logger from "../Logger";

type TypedMethodCallback<Return extends z.ZodTypeAny> = (
  error: Meteor.Error | null,
  result: z.infer<Return> | undefined,
) => void;

type ValidateEJSONable<Schema extends z.ZodTypeAny> =
  z.infer<Schema> extends
    | void
    | EJSONable
    | EJSONableProperty
    | EJSONableProperty[]
    ? Schema
    : "Schema must be an EJSONable type";

class TypedMethod<Args extends z.ZodTuple, Return extends z.ZodTypeAny> {
  name: string;
  args: Args;
  return: Return;

  constructor(
    name: string,
    args: ValidateEJSONable<Args>,
    returnType: ValidateEJSONable<Return>,
  ) {
    check(name, String);
    check(args, Object);
    check(returnType, Object);

    this.name = name;
    this.args = args;
    this.return = returnType;
  }

  call(
    ...args: [...z.infer<Args>, callback?: TypedMethodCallback<Return>]
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
      (error: Meteor.Error, result: z.infer<Return>) => {
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

  async callPromise(...args: z.infer<Args>): Promise<z.infer<Return>> {
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
      return result as z.infer<Return>;
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
