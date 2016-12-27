// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/* global gdrive: true */

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import googleapis from 'googleapis';
import Ansible from '/imports/ansible.js';

let oauthClient = null;
gdrive = null;

let oauthConfig = null;
let oauthCredentials = null;

let oauthTimer = null;

const captureCredentials = function captureCredentials(credentials) {
  if (oauthCredentials.accessToken !== credentials.access_token) {
    Ansible.log('Storing refreshed access token for Google Drive');
    Models.Settings.update({ name: 'gdrive.credential' }, {
      $set: {
        'value.accessToken': credentials.access_token,
        'value.refreshToken': credentials.refresh_token,
        'value.expiresAt': credentials.expiry_date,
      },
    });
  }
};

const createGdriveClient = function createGdriveClient() {
  if (!oauthConfig || !oauthCredentials) {
    gdrive = null;
    return;
  }

  oauthClient = new googleapis.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.secret,
    OAuth._redirectUri('google', oauthConfig));

  // Override _postRequest so we can see if the access token got
  // refreshed
  oauthClient._postRequest = Meteor.bindEnvironment(function (err, result, response, callback) {
    captureCredentials(this.credentials);
    callback(err, result, response);
  }.bind(oauthClient));

  oauthClient.setCredentials({
    access_token: oauthCredentials.accessToken,
    refresh_token: oauthCredentials.refreshToken,
    expiry_date: oauthCredentials.expiresAt,
  });

  gdrive = googleapis.drive({ version: 'v3', auth: oauthClient });
};

const refreshOauthCredentials = function refreshOauthCredentials() {
  Ansible.log('OAuth credentials are about to expire. Manually refreshing');
  Meteor.wrapAsync(oauthClient.refreshAccessToken).bind(oauthClient)();
  captureCredentials(oauthClient.credentials);
};

const updateOauthConfig = function updateOauthConfig(doc) {
  oauthConfig = doc;
  createGdriveClient();
};

const updateOauthCredentials = function updateOauthCredentials(doc) {
  oauthCredentials = doc.value;
  // We just got new credentials so we no longer need the old timer
  if (oauthTimer) {
    Meteor.clearTimeout(oauthTimer);
    oauthTimer = null;
  }

  // If we don't get new credentials before this timer fires, then
  // manually refresh. Include some jitter so not all servers go at
  // once
  const timeout = (oauthCredentials.expiresAt - (new Date()).getTime()) +
          5000 + (5000 * Random.fraction());
  oauthTimer = Meteor.setTimeout(refreshOauthCredentials, timeout);
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
