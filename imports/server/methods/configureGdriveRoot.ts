import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Settings from '../../lib/models/Settings';
import { userMayConfigureGdrive } from '../../lib/permission_stubs';
import configureGdriveRoot from '../../methods/configureGdriveRoot';

configureGdriveRoot.define({
  validate(arg) {
    check(arg, {
      root: Match.Optional(String),
    });
    return arg;
  },

  run({ root }) {
    check(this.userId, String);

    // Only let the same people that can credential gdrive configure root folder,
    // which today is just admins
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    if (root) {
      Settings.upsert(
        { name: 'gdrive.root' },
        { $set: { value: { id: root } } }
      );
    } else {
      Settings.remove({ name: 'gdrive.root' });
    }
  },
});
