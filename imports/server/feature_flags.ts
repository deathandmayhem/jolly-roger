import { Match, check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import FeatureFlags from '../lib/models/FeatureFlags';
import { checkAdmin } from '../lib/permission_stubs';

Meteor.methods({
  setFeatureFlag(name: unknown, type: unknown, random: unknown = undefined) {
    check(this.userId, String);
    check(name, String);
    check(type, Match.OneOf('off', 'on', 'random_by'));
    check(random, type === 'random_by' ? Number : undefined);

    // Feature flags may only be updated by admins
    checkAdmin(this.userId);

    FeatureFlags.upsert({ name }, { $set: { type, random } });
  },
});
