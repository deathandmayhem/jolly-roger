import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Settings from '../../lib/models/Settings';
import { userMayConfigureGdrive } from '../../lib/permission_stubs';
import configureClearGdriveCreds from '../../methods/configureClearGdriveCreds';

configureClearGdriveCreds.define({
  run() {
    check(this.userId, String);
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }
    Ansible.log('Clearing Gdrive creds', {
      user: this.userId,
    });
    Settings.remove({ name: 'gdrive.credential' });
  },
});
