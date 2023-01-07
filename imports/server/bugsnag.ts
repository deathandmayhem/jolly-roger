import { Meteor } from 'meteor/meteor';
import Bugsnag from '@bugsnag/js';
import Fiber from 'fibers';
import isAdmin from '../lib/isAdmin';
import { userIsOperatorForAnyHunt } from '../lib/permission_stubs';
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
        if (user) {
          event.setUser(user._id, user.emails?.[0]?.address, user.displayName);
          event.addMetadata('user', {
            admin: isAdmin(user),
            operator: userIsOperatorForAnyHunt(user),
          });
        }
      }
    },
  });

  addRuntimeConfig(() => {
    return { bugsnagApiKey: apiKey };
  });
}
