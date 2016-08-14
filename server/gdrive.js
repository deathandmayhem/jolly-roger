// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/* global gdrive: true */

import { Meteor } from 'meteor/meteor';
import googleapis from 'googleapis';
import Ansible from '/imports/ansible.js';

gdrive = null;

Meteor.startup(() => {
  const oauthConfig = ServiceConfiguration.configurations.findOne({ service: 'google' });
  if (oauthConfig === undefined) {
    Ansible.log('Disabling gdrive integration because Google OAuth config is not loaded');
    return;
  }

  const oauthClient = new googleapis.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.secret,
    OAuth._redirectUri('google', oauthConfig));

  let storedCredentials = {};

  // Override _postRequest so we can see if the access token got
  // refreshed
  oauthClient._postRequest = Meteor.bindEnvironment(function (err, result, response, callback) {
    if (storedCredentials.accessToken !== this.credentials.access_token) {
      Ansible.log('Storing refreshed access token for Google Drive');
      Models.Settings.update({ name: 'gdrive.credential' }, {
        $set: {
          'value.accessToken': this.credentials.access_token,
          'value.refreshToken': this.credentials.refresh_token,
          'value.expiresAt': this.credentials.expiry_date,
        },
      });
    }

    callback(err, result, response);
  }.bind(oauthClient));

  const updateCredentials = function (token) {
    storedCredentials = token.value;

    oauthClient.setCredentials({
      access_token: token.value.accessToken,
      refresh_token: token.value.refreshToken,
      expiry_date: token.value.expiresAt,
    });
  };

  const cursor = Models.Settings.find({ name: 'gdrive.credential' });
  cursor.observe({ added: updateCredentials, changed: updateCredentials });

  gdrive = googleapis.drive({ version: 'v3', auth: oauthClient });
});
