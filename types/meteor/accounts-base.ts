import type { Meteor } from "meteor/meteor";

declare module "meteor/accounts-base" {
  namespace Accounts {
    // The built-in type declares password as string | undefined, but the implementation supports
    // the output of Accounts._hashPassword as well. We need to support a hashed password to avoid
    // sending the password itself over the wire when making a hunt invitation enrollment request.
    function createUserAsync(
      options: {
        username?: string | undefined;
        email?: string | undefined;
        password?:
          | string
          | {
              digest: string;
              algorithm: string;
            }
          | undefined;
        profile?: Meteor.UserProfile | undefined;
      },
      callback?: (error?: Error | Meteor.Error | Meteor.TypedError) => void,
    ): Promise<string>;
    // The built-in type doesn't allow handler to return a Promise, but the implementation wraps it
    // with Meteor.wrapFn, which gracefully handles Promises.
    function registerLoginHandler(
      handler: (
        options: any,
      ) =>
        | undefined
        | LoginMethodResult
        | Promise<undefined | LoginMethodResult>,
    ): void;
    function removeDefaultRateLimit(): void;
    function setDefaultPublishFields(
      fields: Partial<Record<keyof Meteor.User, 1 | 0>>,
    ): void;
  }
}
