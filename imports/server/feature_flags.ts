import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Roles } from 'meteor/nicolaslopezj:roles';
import FeatureFlags from '../lib/models/feature_flags';

Meteor.methods({
  setFeatureFlag(name: string, type: "off" | "on" | "random_by", random: number | undefined = undefined) {
    check(this.userId, String);
    check(name, String);
    check(type, Match.OneOf('off', 'on', 'random_by'));
    check(random, type === 'random_by' ? Number : undefined);

    Roles.checkPermission(this.userId, 'mongo.featureflags.update');

    FeatureFlags.upsert({ name }, { $set: { type, random } });
  },
});
