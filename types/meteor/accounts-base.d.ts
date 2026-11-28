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
      callback?: (error?: Error | Meteor.Error) => void,
    ): Promise<string>;

    // Server-only. Creates the indexes on Meteor.users; accounts-base calls it
    // at startup without awaiting the result.
    function init(): Promise<void>;

    function removeDefaultRateLimit(): void;
    function setDefaultPublishFields(
      fields: Partial<Record<keyof Meteor.User, 1 | 0>>,
    ): void;

    // Meteor awaits these, but upstream types them as synchronous
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
