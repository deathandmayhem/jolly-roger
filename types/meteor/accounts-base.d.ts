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

    function removeDefaultRateLimit(): void;
    function setDefaultPublishFields(
      fields: Partial<Record<keyof Meteor.User, 1 | 0>>,
    ): void;

    // @types/meteor needs to be updated to allow async handler functions here
    function registerLoginHandler(
      handler: (
        options: any,
      ) =>
        | undefined
        | LoginMethodResult
        | Promise<undefined | LoginMethodResult>,
    ): void;
    function registerLoginHandler(
      name: string,
      handler: (
        options: any,
      ) =>
        | undefined
        | LoginMethodResult
        | Promise<undefined | LoginMethodResult>,
    ): void;

    // @types/meteor needs to be updated to allow async functions for email field generators
    interface EmailFields {
      from?: ((user: Meteor.User) => string | Promise<string>) | undefined;
      subject?: ((user: Meteor.User) => string | Promise<string>) | undefined;
      text?:
        | ((user: Meteor.User, url: string) => string | Promise<string>)
        | undefined;
      html?:
        | ((user: Meteor.User, url: string) => string | Promise<string>)
        | undefined;
    }
    interface EmailTemplates {
      from: string;
      siteName: string;
      headers?: Header | undefined;
      resetPassword: EmailFields;
      enrollAccount: EmailFields;
      verifyEmail: EmailFields;
    }
    var emailTemplates: EmailTemplates;
  }
}
