import { check } from 'meteor/check';
import Hunts from '../../lib/models/Hunts';
import { checkAdmin } from '../../lib/permission_stubs';
import destroyHunt from '../../methods/destroyHunt';

destroyHunt.define({
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  run({ huntId }) {
    check(this.userId, String);
    checkAdmin(this.userId);

    Hunts.destroy(huntId);
  },
});
