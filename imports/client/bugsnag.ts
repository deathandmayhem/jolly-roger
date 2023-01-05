import { Meteor } from 'meteor/meteor';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';

if (__meteor_runtime_config__.bugsnagApiKey) {
  Bugsnag.start({
    apiKey: __meteor_runtime_config__.bugsnagApiKey,
    appVersion: Meteor.gitCommitHash,
    plugins: [new BugsnagPluginReact()],
    onError: (event) => {
      const user = Meteor.user();
      event.setUser(user?._id, user?.emails?.[0]?.address, user?.displayName);
    },
  });
}
