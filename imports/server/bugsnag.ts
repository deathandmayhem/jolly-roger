import { Meteor } from 'meteor/meteor';
import Bugsnag from '@bugsnag/js';
import Fiber from 'fibers';
import addRuntimeConfig from './addRuntimeConfig';

const apiKey = process.env.BUGSNAG_API_KEY;

if (apiKey) {
  Bugsnag.start({
    apiKey,
    appVersion: Meteor.gitCommitHash,
    redactedKeys: [
      'password',
      'token',
      'clientId',
      'clientSecret',
      'key',
      'secret',
      'dtlsParameters',
    ],
    onError: (event) => {
      if (Fiber.current) {
        const user = Meteor.user();
        event.setUser(user?._id, user?.emails?.[0]?.address, user?.displayName);
      }
    },
  });

  addRuntimeConfig(() => {
    return { bugsnagApiKey: apiKey };
  });
}
