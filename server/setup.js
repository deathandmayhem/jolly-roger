import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '/imports/ansible.js';

Roles.registerAction('gdrive.credential', true);

Meteor.methods({
  setupGdriveCreds(key, secret) {
    check(this.userId, String);
    check(key, String);
    check(secret, String);
    Roles.checkPermission(this.userId, 'gdrive.credential');

    const credential = Google.retrieveCredential(key, secret);
    const { refreshToken, email } = credential.serviceData;
    Ansible.log('Updating Gdrive creds', {
      email,
      user: this.userId,
    });
    Models.Settings.upsert({ name: 'gdrive.credential' }, {
      $set: { value: { refreshToken, email } } });
  },
});
