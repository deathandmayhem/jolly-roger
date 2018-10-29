import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import googleapis from 'googleapis';
import Ansible from '../ansible.js';
import Settings from './models/settings.js';

class GDriveClientRefresher {
  constructor() {
    this.gdrive = null;
    this.oauthClient = null;
    this.oauthConfig = null;
    this.oauthRefreshToken = null;
    this.oauthTimer = null;

    // Watch for config changes, and refresh the gdrive instance if anything changes
    this.oauthConfigCursor = ServiceConfiguration.configurations.find({ service: 'google' });
    this.oauthCredentialCursor = Settings.find({ name: 'gdrive.credential' });
    this.oauthConfigCursor.observe({
      added: doc => this.updateOauthConfig(doc),
      changed: doc => this.updateOauthConfig(doc),
      removed: () => this.updateOauthConfig(null),
    });
    this.oauthCredentialCursor.observe({
      added: doc => this.updateOauthCredentials(doc),
      changed: doc => this.updateOauthCredentials(doc),
      removed: () => this.updateOauthCredentials({ value: {} }),
    });
  }

  updateOauthConfig(doc) {
    // console.log("updateOauthConfig", doc);
    this.oauthConfig = doc;
    this.recreateGdriveClient();
  }

  updateOauthCredentials(doc) {
    // console.log("updateOauthCredentials", doc);
    this.oauthRefreshToken = doc.value.refresh_token;
    this.recreateGdriveClient();
  }

  ready() {
    return !!this.gdrive;
  }

  recreateGdriveClient() {
    if (!this.oauthConfig || !this.oauthRefreshToken) {
      // Can't init if no config or long-lived refresh token
      this.gdrive = null;
      return;
    }

    // If there was a timer set, clear it -- we're refreshing now.
    if (this.oauthTimer) {
      Meteor.clearTimeout(this.oauthTimer);
      this.oauthTimer = null;
    }

    // Construct a new OAuth2 client with the app id and secret and redirect uri
    this.oauthClient = new googleapis.auth.OAuth2(
      this.oauthConfig.clientId,
      this.oauthConfig.secret,
      OAuth._redirectUri('google', this.oauthConfig)
    );

    // Set the refresh token for that client
    this.oauthClient.setCredentials({
      refresh_token: this.oauthRefreshToken,
    });

    // Exchange the refresh token for an access token
    Ansible.log('Refreshing Google OAuth access token for Google Drive');
    const credentials = Meteor.wrapAsync(this.oauthClient.refreshAccessToken, this.oauthClient)();

    // Schedule to refresh the access token a quarter through its lifecycle
    // (should be about every 15 minutes), with some jitter
    const timeout = (credentials.expiry_date - (new Date()).getTime()) / 4;
    const jitter = 5000 * Random.fraction();
    this.oauthTimer = Meteor.setTimeout(() => this.recreateGdriveClient(), timeout - jitter);

    this.gdrive = googleapis.drive({ version: 'v3', auth: this.oauthClient });
  }
}

const globalClientHolder = new GDriveClientRefresher();

export default globalClientHolder;
