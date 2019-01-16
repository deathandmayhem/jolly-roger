import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import FeatureFlags from '../lib/models/feature_flags';

Meteor.methods({
  setFeatureFlag(name, type, random = null) {
    check(this.userId, String);
    check(name, String);
    check(type, Match.OneOf('off', 'on', 'random'));
    check(random, type === 'random' ? Number : null);

    Roles.checkPermission(this.userId, 'mongo.featureflags.update');

    FeatureFlags.upsert({ name }, { $set: { type, random } });
  },
});
