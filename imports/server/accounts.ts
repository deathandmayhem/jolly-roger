import { Accounts } from "meteor/accounts-base";
import { Google } from "meteor/google-oauth";
import { Meteor } from "meteor/meteor";
import Mustache from "mustache";
import Logger from "../Logger";
import Hunts from "../lib/models/Hunts";
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

type LoginOptions = {
  isGoogleJrLogin?: boolean;
  key?: string;
  secret?: string;
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

Accounts.registerLoginHandler((options: LoginOptions) => {
  // Only handle requests that include our hook's custom flag.
  if (!options.isGoogleJrLogin) {
    return undefined;
  }

  if (!options.key || !options.secret) {
    throw new Meteor.Error(
      400,
      "Google authentication request missing key or secret",
    );
  }

  const credential = Google.retrieveCredential(options.key, options.secret);
  const googleAccountId = credential.serviceData.id;

  // Attempt to match existing Google users by their linked account ID.
  // We can't use the async method since Meteor's API only takes a sync one.
  // eslint-disable-next-line jolly-roger/no-disallowed-sync-methods
  const users = MeteorUsers.find({ googleAccountId }, { limit: 2 }).fetch();
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

function makeView(user: Meteor.User, url: string) {
  // eslint-disable-next-line jolly-roger/no-disallowed-sync-methods
  const hunts = Hunts.find({ _id: { $in: user.hunts } }).fetch();
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
  Accounts.emailTemplates.enrollAccount.text = (user, url: string) => {
    const view = makeView(user, url);
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
  Accounts.emailTemplates.enrollAccount.text = (user, url: string) => {
    const view = makeView(user, url);
    return Mustache.render(DEFAULT_ENROLL_ACCOUNT_TEMPLATE, view);
  };
}

// Scope hoisted to keep the handle alive beyond the startup block.
let configCursor;

Meteor.startup(() => {
  // Initialize to default values
  clearEmailTemplatesHooks();

  // Set up observer
  configCursor = Settings.find({ name: "email.branding" });
  configCursor.observe({
    added: (doc) => updateEmailTemplatesHooks(doc),
    changed: (doc) => updateEmailTemplatesHooks(doc),
    removed: () => clearEmailTemplatesHooks(),
  });
});
