import { check, Match } from 'meteor/check';
import FeatureFlags from '../../lib/models/FeatureFlags';
import { checkAdmin } from '../../lib/permission_stubs';
import setFeatureFlag from '../../methods/setFeatureFlag';

setFeatureFlag.define({
  validate(arg) {
    check(arg, {
      name: String,
      type: Match.OneOf('off', 'on'),
    });

    return arg;
  },

  run({ name, type }) {
    // Feature flags may only be updated by admins
    checkAdmin(this.userId);

    FeatureFlags.upsert({ name }, { $set: { type } });
  },
});
