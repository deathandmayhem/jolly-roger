import { check } from "meteor/check";
import type { EJSONable, EJSONableProperty } from "meteor/ejson";
import { EJSON } from "meteor/ejson";
import { Meteor } from "meteor/meteor";
import Bugsnag from "@bugsnag/js";
import Logger from "../Logger";
import type ValidateShape from "../lib/ValidateShape";

export type TypedMethodParam = EJSONable | EJSONableProperty;
export type TypedMethodArgs = Record<string, TypedMethodParam> | void;
type TypedMethodCallback<Return extends TypedMethodParam | void> =
  Return extends void
    ? (error?: Meteor.Error) => void
    : <Error extends true | false>(
        error: Error extends true ? Meteor.Error : undefined,
        result: Error extends false ? Return : undefined,
      ) => void;
type TypedMethodCallArgs<
  T,
  Arg extends TypedMethodArgs,
  Return extends TypedMethodParam | void,
> = Arg extends void
  ? [TypedMethodCallback<Return>] | []
  :
      | [ValidateShape<T, Arg>, TypedMethodCallback<Return>]
      | [ValidateShape<T, Arg>];
type TypedMethodCallPromiseArgs<
  T,
  Arg extends TypedMethodArgs,
> = Arg extends void ? [] : [ValidateShape<T, Arg>];

export function stringifyMethodArgs(arg: unknown): string | undefined {
  if (typeof arg !== "object" || !arg) {
    return undefined;
  }
  return JSON.stringify(EJSON.toJSONValue(arg as EJSONable), (_key, value) =>
    typeof value?.$binary === "string"
      ? {
          $binary: `<${Math.floor(
            (value.$binary.replace(/=+$/, "").length * 3) / 4,
          )} bytes>`,
        }
      : value,
  );
}

class TypedMethod<
  Args extends TypedMethodArgs,
  Return extends TypedMethodParam | void,
> {
  name: string;

  constructor(name: string) {
    check(name, String);

    this.name = name;
  }

  /** @deprecated Use callPromise on the server */
  call<T>(...args: TypedMethodCallArgs<T, Args, Return>): void {
    let callback: TypedMethodCallback<Return> | undefined;
    if (typeof args.at(-1) === "function") {
      callback = args.pop() as TypedMethodCallback<Return>;
    }

    if (Bugsnag.isStarted()) {
      Bugsnag.leaveBreadcrumb(
        "Meteor method call",
        {
          method: this.name,
          arguments: stringifyMethodArgs(args[0]),
        },
        "request",
      );
    }

    // oxlint-disable-next-line typescript/no-deprecated -- the sync variant is for client code
    Meteor.call(this.name, ...args, (error: Meteor.Error, result: Return) => {
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
          arguments: stringifyMethodArgs(args[0]),
        });
      }
      callback?.(error, result as any);
    });
  }

  async callPromise<T>(
    ...args: TypedMethodCallPromiseArgs<T, Args>
  ): Promise<Return> {
    try {
      if (Bugsnag.isStarted()) {
        Bugsnag.leaveBreadcrumb(
          "Meteor method call",
          {
            method: this.name,
            arguments: stringifyMethodArgs(args[0]),
          },
          "request",
        );
      }
      const result = await Meteor.callAsync(this.name, ...args);
      return result as Return;
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
          arguments: stringifyMethodArgs(args[0]),
        });
      }
      throw error;
    }
  }
}

export default TypedMethod;
