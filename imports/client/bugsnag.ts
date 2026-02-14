import { Meteor } from "meteor/meteor";
import Bugsnag from "@bugsnag/js";
import BugsnagPluginReact from "@bugsnag/plugin-react";
import isAdmin from "../lib/isAdmin";
import { primaryEmail } from "../lib/models/User";
import { huntsUserIsOperatorFor } from "../lib/permission_stubs";

if (__meteor_runtime_config__.bugsnagApiKey) {
  Bugsnag.start({
    apiKey: __meteor_runtime_config__.bugsnagApiKey,
    appVersion: Meteor.gitCommitHash,
    releaseStage: Meteor.isDevelopment ? "development" : "production",
    plugins: [new BugsnagPluginReact()],
    onError: (event) => {
      // Suppress SockJS JSONP transport race condition errors (#2286).
      // These occur when a JSONP callback is cleaned up before its <script>
      // tag finishes loading -- a transient connectivity artifact, not a bug
      // we can fix.
      const message = event.errors[0]?.errorMessage ?? "";
      if (/^_jp\.\w+ is not a function$/.test(message)) {
        return false;
      }

      const user = Meteor.user();
      if (user) {
        event.setUser(user._id, primaryEmail(user), user.displayName);
        event.addMetadata("user", {
          admin: isAdmin(user),
          operator: huntsUserIsOperatorFor(user),
        });
      }

      return true;
    },
  });
}
