// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/* global gdrive: true */

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import googleapis from 'googleapis';
import Ansible from '../ansible.js';

let oauthClient = null;
gdrive = null;

let oauthConfig = null;
let oauthRefreshToken = null;

let oauthTimer = null;

const createGdriveClient = function createGdriveClient() {
  if (!oauthConfig || !oauthRefreshToken) {
    gdrive = null;
    return;
  }

  // We're throwing away the old client, so reset timers
  if (oauthTimer) {
    Meteor.clearTimeout(oauthTimer);
    oauthTimer = null;
  }

  oauthClient = new googleapis.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.secret,
    OAuth._redirectUri('google', oauthConfig));

  oauthClient.setCredentials({
    refresh_token: oauthRefreshToken,
  });

  Ansible.log('Refreshing Google OAuth access token for Google Drive');
  const credentials = Meteor.wrapAsync(oauthClient.refreshAccessToken, oauthClient)();
  // Schedule to refresh the token a quarter through its lifecycle
  // (should be about every 15 minutes), with some jitter
  const timeout = (credentials.expiry_date - (new Date()).getTime()) / 4;
  const jitter = 5000 * Random.fraction();
  oauthTimer = Meteor.setTimeout(createGdriveClient, timeout - jitter);

  gdrive = googleapis.drive({ version: 'v3', auth: oauthClient });
};

const updateOauthConfig = function updateOauthConfig(doc) {
  oauthConfig = doc;
  createGdriveClient();
};

const updateOauthCredentials = function updateOauthCredentials(doc) {
  oauthRefreshToken = doc.value.refreshToken;
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
    removed: () => updateOauthCredentials({ value: {} }),
  });
});
