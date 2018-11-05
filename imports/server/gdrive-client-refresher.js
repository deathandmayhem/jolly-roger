import { google } from 'googleapis';
import Settings from '../lib/models/settings.js';

class GDriveClientRefresher {
  constructor() {
    this.gdrive = null;
    this.oauthClient = null;
    this.oauthConfig = null;
    this.oauthRefreshToken = null;

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
    this.oauthConfig = doc;
    this.recreateGdriveClient();
  }

  updateOauthCredentials(doc) {
    this.oauthRefreshToken = doc.value.refreshToken;
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

    // Construct a new OAuth2 client with the app id and secret and redirect uri
    this.oauthClient = new google.auth.OAuth2(
      this.oauthConfig.clientId,
      this.oauthConfig.secret,
      OAuth._redirectUri('google', this.oauthConfig)
    );

    // Set the refresh token for that client
    this.oauthClient.setCredentials({
      refresh_token: this.oauthRefreshToken,
    });

    // Construct the drive client, using that OAuth2 client.
    this.gdrive = google.drive({ version: 'v3', auth: this.oauthClient });
  }
}

const globalClientHolder = new GDriveClientRefresher();

export default globalClientHolder;
