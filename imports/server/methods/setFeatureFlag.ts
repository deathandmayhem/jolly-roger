import { check, Match } from 'meteor/check';
import FeatureFlags from '../../lib/models/FeatureFlags';
import { checkAdmin } from '../../lib/permission_stubs';
import setFeatureFlag from '../../methods/setFeatureFlag';

setFeatureFlag.define({
  validate(arg) {
    check(arg, {
      name: String,
      type: Match.OneOf('off', 'on', 'random_by'),
      random: Match.Optional(Number),
    });

    // This check won't be reflected in the type signature, but reflects that
    // "random" is only valid if type is "random_by"
    check(arg.random, arg.type === 'random_by' ? Number : undefined);

    return arg;
  },

  run({ name, type, random }) {
    // Feature flags may only be updated by admins
    checkAdmin(this.userId);

    FeatureFlags.upsert({ name }, { $set: { type, random } });
  },
});
