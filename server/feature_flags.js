import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

Meteor.methods({
  setFeatureFlag(name, type, random = null) {
    check(this.userId, String);
    check(name, String);
    check(type, Match.OneOf('off', 'on', 'random'));
    check(random, type === 'random' ? Number : null);

    Models.FeatureFlags.upsert({ name }, { $set: { type, random } });
  },
});
