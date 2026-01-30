import { Meteor } from "meteor/meteor";

import Bugsnag from "@bugsnag/js";
import BugsnagPluginReact from "@bugsnag/plugin-react";

import isAdmin from "../lib/isAdmin";
import { huntsUserIsOperatorFor } from "../lib/permission_stubs";

if (__meteor_runtime_config__.bugsnagApiKey) {
  Bugsnag.start({
    apiKey: __meteor_runtime_config__.bugsnagApiKey,
    appVersion: Meteor.gitCommitHash,
    releaseStage: Meteor.isDevelopment ? "development" : "production",
    plugins: [new BugsnagPluginReact()],
    onError: (event) => {
      const user = Meteor.user();
      if (user) {
        event.setUser(user._id, user.emails?.[0]?.address, user.displayName);
        event.addMetadata("user", {
          admin: isAdmin(user),
          operator: huntsUserIsOperatorFor(user),
        });
      }
    },
  });
}
