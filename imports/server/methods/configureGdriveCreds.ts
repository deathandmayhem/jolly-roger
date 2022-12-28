import { check } from 'meteor/check';
import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Settings from '../../lib/models/Settings';
import { userMayConfigureGdrive } from '../../lib/permission_stubs';
import configureGdriveCreds from '../../methods/configureGdriveCreds';

configureGdriveCreds.define({
  validate(arg) {
    check(arg, {
      key: String,
      secret: String,
    });
    return arg;
  },

  async run({ key, secret }) {
    check(this.userId, String);

    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    const credential = Google.retrieveCredential(key, secret);
    const { refreshToken, email } = credential.serviceData;
    Ansible.log('Updating Gdrive creds', {
      email,
      user: this.userId,
    });
    await Settings.upsertAsync(
      { name: 'gdrive.credential' },
      { $set: { value: { refreshToken, email } } }
    );
  },
});
