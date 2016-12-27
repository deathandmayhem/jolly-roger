// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/* global gdrive: true */

import { Meteor } from 'meteor/meteor';
import googleapis from 'googleapis';
import Ansible from '/imports/ansible.js';

gdrive = null;

let oauthConfig = null;
let oauthCredentials = null;

const createGdriveClient = function createGdriveClient() {
  if (!oauthConfig || !oauthCredentials) {
    gdrive = null;
    return;
  }

  const oauthClient = new googleapis.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.secret,
    OAuth._redirectUri('google', oauthConfig));

  // Override _postRequest so we can see if the access token got
  // refreshed
  oauthClient._postRequest = Meteor.bindEnvironment(function (err, result, response, callback) {
    if (oauthCredentials.accessToken !== this.credentials.access_token) {
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

  gdrive = googleapis.drive({ version: 'v3', auth: oauthClient });
};

const updateOauthConfig = function updateOauthConfig(doc) {
  oauthConfig = doc;
  createGdriveClient();
};

const updateOauthCredentials = function updateOauthCredentials(doc) {
  oauthCredentials = doc.value;
  createGdriveClient();
};

Meteor.startup(() => {
  const oauthConfigCursor = ServiceConfiguration.configurations.find({ service: 'google' });
  const oauthCredentialsCursor = Models.Settings.find({ name: 'gdrive.credential' });
  oauthConfigCursor.observe({
    added: updateOauthConfig,
    changed: updateOauthConfig,
    removed: () => updateOauthConfig(null),
  });

  oauthCredentialsCursor.observe({
    added: updateOauthCredentials,
    changed: updateOauthCredentials,
    removed: () => updateOauthCredentials({ value: null }),
  });
});
