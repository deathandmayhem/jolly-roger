import { Accounts } from "meteor/accounts-base";
import { Match, check } from "meteor/check";
import { Google } from "meteor/google-oauth";
import { Meteor } from "meteor/meteor";
import Mustache from "mustache";
import Logger from "../Logger";
import type { LoginOptions } from "../lib/loginOptions";
import Hunts from "../lib/models/Hunts";
import InvitationCodes from "../lib/models/InvitationCodes";
import MeteorUsers from "../lib/models/MeteorUsers";
import type { SettingType } from "../lib/models/Settings";
import Settings from "../lib/models/Settings";

type LoginInfo = {
  type: string;
  allowed: boolean;
  error?: Meteor.Error;
  user?: Meteor.User;
  connection: Meteor.Connection;
  methodName: string;
  methodArguments: any[];
};

const summaryFromLoginInfo = function (info: LoginInfo) {
  switch (info.methodName) {
    case "login": {
      const email = info.methodArguments?.[0]?.user?.email;
      return {
        msg: "User logged in",
        email,
      };
    }
    case "resetPassword":
      /* We can't tell if this is a reset or an enrollment, because the
         user object already reflects the changed state. Womp womp */
      return {
        msg: "User reset password and logged in",
        email: info?.user?.emails?.[0]?.address,
      };
    default:
      Logger.info("Received login hook from unknown method", {
        method: info.methodName,
      });
      return {
        msg: "User logged in by unknown method",
        email: info?.user?.emails?.[0]?.address,
        method: info.methodName,
      };
  }
};

Accounts.registerLoginHandler(async (options: LoginOptions) => {
  // Only handle requests that include our hook's custom flag.
  if (!options.isJrLogin) {
    return undefined;
  }

  check(options, {
    isJrLogin: true,
    googleCredentials: Match.Optional({
      key: String,
      secret: String,
    }),
    allowAutoProvision: Match.Optional({
      huntInvitationCode: String,
    }),
  });

  // If an invitation code is provided, create a new user if needed.
  // We don't actually add the user to the hunt here - that should be handled once the user is
  // signed in and redirected to the /join URL they originally tried to access.
  if (options.allowAutoProvision) {
    if (!options.googleCredentials) {
      throw new Meteor.Error(
        400,
        "Autoprovisioning login request is missing Google credentials",
      );
    }

    const invitation = await InvitationCodes.findOneAsync({
      code: options.allowAutoProvision.huntInvitationCode,
    });
    if (!invitation) {
      throw new Meteor.Error(404, "Invalid invitation code");
    }

    const hunt = await Hunts.findOneAsync({
      _id: invitation.hunt,
    });
    if (!hunt) {
      throw new Meteor.Error(404, "Hunt does not exist for invitation");
    }

    // Google credentials were provided - obtain the email from the associated account,
    // create a passwordless account with that email, and link it to the Google account.
    // Also set the initial displayName for the user to their Google account's name.
    const credential = await Google.retrieveCredential(
      options.googleCredentials.key,
      options.googleCredentials.secret,
    );
    const { email, id, name, picture } = credential.serviceData;
    const users = await MeteorUsers.find(
      { googleAccountId: id },
      { limit: 2 },
    ).fetchAsync();
    switch (users.length) {
      case 0: {
        // Autoprovision a new user
        const userId = await Accounts.createUserAsync({
          email,
        });
        await MeteorUsers.updateAsync(userId, {
          $set: {
            googleAccount: email,
            googleAccountId: id,
            googleProfilePicture: picture,
            displayName: name,
          },
        });
        // Tell accounts-base to log the user in.
        return { userId };
      }
      case 1: {
        // The user already exists, so just log them in.
        const userId = users[0]?._id;
        if (!userId) {
          throw new Meteor.Error(500, "User missing ID");
        }
        await MeteorUsers.updateAsync(userId, {
          $set: {
            googleAccount: email,
            googleProfilePicture: picture,
          },
        });
        return { userId };
      }
      default: {
        throw new Meteor.Error(
          400,
          "Google account is associated with multiple users",
        );
      }
    }
  }

  // Otherwise, we only support Google sign-in; password sign-ins use the normal handler.
  if (!options.googleCredentials) {
    throw new Meteor.Error(
      400,
      "Google authentication request missing credentials",
    );
  }

  const credential = await Google.retrieveCredential(
    options.googleCredentials.key,
    options.googleCredentials.secret,
  );
  const { email, id, picture } = credential.serviceData;

  // Attempt to match existing Google users by their linked account ID.
  const users = await MeteorUsers.find(
    { googleAccountId: id },
    { limit: 2 },
  ).fetchAsync();
  switch (users.length) {
    case 0: {
      throw new Meteor.Error(
        403,
        "Google account is not associated with any user",
      );
    }
    case 1: {
      const userId = users[0]?._id;
      if (!userId) {
        throw new Meteor.Error(500, "User missing ID");
      }
      await MeteorUsers.updateAsync(userId, {
        $set: {
          googleAccount: email,
          googleProfilePicture: picture,
        },
      });
      return { userId };
    }
    default: {
      throw new Meteor.Error(
        400,
        "Google account is associated with multiple users",
      );
    }
  }
});

Accounts.onLogin(async (info: LoginInfo) => {
  if (!info.user?._id)
    throw new Meteor.Error(500, "Something has gone horribly wrong");
  // Capture login time
  await MeteorUsers.updateAsync(info.user._id, {
    $set: { lastLogin: new Date() },
  });

  if (info.type === "resume") {
    return;
  }

  const summary = {
    ...summaryFromLoginInfo(info),
    user: info.user._id,
    ip: info.connection.clientAddress,
  };
  const { msg, ...logContext } = summary;

  Logger.info(msg, logContext);
});

Accounts.onLoginFailure((info: LoginInfo) => {
  const email = info.methodArguments?.[0]?.user?.email;
  const data = {
    user: info.user?._id,
    email,
    ip: info.connection.clientAddress,
    error: info.error,
  };
  Logger.info("Failed login attempt", data);
});

Accounts.urls.enrollAccount = (token) => Meteor.absoluteUrl(`enroll/${token}`);
Accounts.urls.resetPassword = (token) =>
  Meteor.absoluteUrl(`reset-password/${token}`);

const DEFAULT_ENROLL_ACCOUNT_SUBJECT_TEMPLATE =
  "[jolly-roger] You're invited to {{siteName}}";
const DEFAULT_ENROLL_ACCOUNT_TEMPLATE =
  "Hiya!\n" +
  "\n" +
  "Someone on Death and Mayhem has invited you to join our internal team website and " +
  "virtual headquarters, {{siteName}}, so that you can join us " +
  "for the MIT Mystery Hunt.\n" +
  "\n" +
  "To create your account, simply click the link below, fill out a few details for us, and " +
  'click "Register".\n' +
  "\n" +
  "{{&url}}\n" +
  "\n" +
  "{{#huntNamesCount}}" +
  "Once you register your account, you'll also be signed up " +
  "for these specific hunts:\n" +
  "\n" +
  "{{huntNamesCommaSeparated}}\n" +
  "\n" +
  "{{/huntNamesCount}}" +
  "{{#mailingListsCount}}" +
  "You've also been put onto a handful of mailing lists for " +
  "communication about these and future hunts:\n" +
  "\n" +
  "{{mailingListsCommaSeparated}}" +
  "\n" +
  "{{/mailingListsCount}}" +
  "After you've registered your account, you can keep it permanently. We'll use it if you " +
  "hunt with us again.\n" +
  "\n" +
  "The site itself is under pretty active construction, so expect quite a few changes in the " +
  "next few days, but let us know if you run into any major bugs at dfa-web@mit.edu.\n" +
  "\n" +
  "Happy Puzzling,\n" +
  "- The Jolly Roger Web Team\n" +
  "\n" +
  "This message was sent to {{email}}";

async function makeView(user: Meteor.User, url: string) {
  const hunts = await Hunts.find({ _id: { $in: user.hunts } }).fetchAsync();
  const email = user?.emails?.[0]?.address;
  const huntNames = hunts.map((h) => h.name);
  const huntNamesCount = huntNames.length;
  const huntNamesCommaSeparated = huntNames.join(", ");
  const mailingLists = [...new Set(hunts.map((h) => h.mailingLists).flat())];
  const mailingListsCount = mailingLists.length;
  const mailingListsCommaSeparated = mailingLists.join(", ");
  return {
    huntNames,
    huntNamesCount,
    huntNamesCommaSeparated,
    mailingLists,
    mailingListsCount,
    mailingListsCommaSeparated,
    siteName: Accounts.emailTemplates.siteName,
    email,
    url,
  };
}

function updateEmailTemplatesHooks(
  doc: SettingType & { name: "email.branding" },
) {
  Accounts.emailTemplates.from = doc.value.from
    ? doc.value.from
    : "no-reply@example.com";
  Accounts.emailTemplates.enrollAccount.subject = (user: Meteor.User) => {
    const view = {
      user,
      siteName: Accounts.emailTemplates.siteName,
    };
    if (doc.value.enrollAccountMessageSubjectTemplate) {
      return Mustache.render(
        doc.value.enrollAccountMessageSubjectTemplate,
        view,
      );
    } else {
      return Mustache.render(DEFAULT_ENROLL_ACCOUNT_SUBJECT_TEMPLATE, view);
    }
  };
  Accounts.emailTemplates.enrollAccount.text = async (user, url: string) => {
    const view = await makeView(user, url);
    if (doc.value.enrollAccountMessageTemplate) {
      return Mustache.render(doc.value.enrollAccountMessageTemplate, view);
    } else {
      return Mustache.render(DEFAULT_ENROLL_ACCOUNT_TEMPLATE, view);
    }
  };
}

function clearEmailTemplatesHooks() {
  Accounts.emailTemplates.from = "no-reply@example.com";
  Accounts.emailTemplates.enrollAccount.subject = () => {
    return `[jolly-roger] You're invited to ${Accounts.emailTemplates.siteName}`;
  };
  Accounts.emailTemplates.enrollAccount.text = async (user, url: string) => {
    const view = await makeView(user, url);
    return Mustache.render(DEFAULT_ENROLL_ACCOUNT_TEMPLATE, view);
  };
}

// Scope hoisted to keep the handle alive beyond the startup block.
let configCursor;

Meteor.startup(async () => {
  // Initialize to default values
  clearEmailTemplatesHooks();

  // Set up observer
  configCursor = Settings.find({ name: "email.branding" });
  await configCursor.observeAsync({
    added: (doc) => updateEmailTemplatesHooks(doc),
    changed: (doc) => updateEmailTemplatesHooks(doc),
    removed: () => clearEmailTemplatesHooks(),
  });
});
