import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '../ansible.js';
import Settings from './models/settings.js';

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
    Settings.upsert({ name: 'gdrive.credential' },
      { $set: { value: { refreshToken, email } } });
  },
});
