import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { Google } from 'meteor/google-oauth';
import { Roles } from 'meteor/nicolaslopezj:roles';
import Ansible from '../ansible';
import Settings from '../lib/models/settings';

Meteor.methods({
  setupGoogleOAuthClient(clientId: string, secret: string) {
    check(this.userId, String);
    check(clientId, String);
    check(secret, String);
    Roles.checkPermission(this.userId, 'google.configureOAuth');

    Ansible.log('Configuring google oauth client', {
      clientId,
      user: this.userId,
    });
    ServiceConfiguration.configurations.upsert({ service: 'google' }, {
      $set: {
        clientId,
        secret,
        loginStyle: 'popup',
      },
    });
  },

  setupGdriveCreds(key: string, secret: string) {
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

  clearGdriveCreds() {
    check(this.userId, String);
    Roles.checkPermission(this.userId, 'gdrive.credential');
    Ansible.log('Clearing Gdrive creds', {
      user: this.userId,
    });
    Settings.remove({ name: 'gdrive.credential' });
  },

  setupGdriveTemplates(
    spreadsheetTemplate: string | undefined,
    documentTemplate: string | undefined
  ) {
    check(this.userId, String);
    check(spreadsheetTemplate, Match.Maybe(String));
    check(documentTemplate, Match.Maybe(String));
    // Only let the same people that can credential gdrive configure templates,
    // which today is just admins
    Roles.checkPermission(this.userId, 'gdrive.credential');

    // In an ideal world, maybe we'd verify that the document IDs we were given
    // are actually like valid documents that we can reach or something.
    if (spreadsheetTemplate) {
      Settings.upsert({ name: 'gdrive.template.spreadsheet' },
        { $set: { value: { id: spreadsheetTemplate } } });
    } else {
      Settings.remove({ name: 'gdrive.template.spreadsheet' });
    }

    if (documentTemplate) {
      Settings.upsert({ name: 'gdrive.template.document' },
        { $set: { value: { id: documentTemplate } } });
    } else {
      Settings.remove({ name: 'gdrive.template.document' });
    }
  },
});
