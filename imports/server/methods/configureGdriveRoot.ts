import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Settings from '../../lib/models/Settings';
import { userMayConfigureGdrive } from '../../lib/permission_stubs';
import { optional } from '../../methods/TypedMethod';
import configureGdriveRoot from '../../methods/configureGdriveRoot';

configureGdriveRoot.define({
  validate(arg) {
    check(arg, {
      root: optional(String),
    });
    return arg;
  },

  async run({ root }) {
    check(this.userId, String);

    // Only let the same people that can credential gdrive configure root folder,
    // which today is just admins
    if (!userMayConfigureGdrive(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    if (root) {
      await Settings.upsertAsync(
        { name: 'gdrive.root' },
        { $set: { value: { id: root } } }
      );
    } else {
      await Settings.removeAsync({ name: 'gdrive.root' });
    }
  },
});
