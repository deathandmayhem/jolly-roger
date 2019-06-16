/* eslint-disable camelcase */
import { Mongo } from 'meteor/mongo';
import { ServiceConfiguration, Configuration } from 'meteor/service-configuration';
import { OAuth } from 'meteor/oauth';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import Settings from '../lib/models/settings';
import { SettingType } from '../lib/schemas/settings';

class GDriveClientRefresher {
  public gdrive?: drive_v3.Drive;

  private oauthClient?: OAuth2Client;

  private oauthConfig?: Configuration;

  private oauthRefreshToken?: string;

  private oauthConfigCursor: Mongo.Cursor<Configuration>

  private oauthCredentialCursor: Mongo.Cursor<SettingType>

  constructor() {
    this.gdrive = undefined;
    this.oauthClient = undefined;
    this.oauthConfig = undefined;
    this.oauthRefreshToken = undefined;

    // Watch for config changes, and refresh the gdrive instance if anything changes
    this.oauthConfigCursor = <Mongo.Cursor<Configuration>>ServiceConfiguration.configurations.find({ service: 'google' });
    this.oauthCredentialCursor = Settings.find({ name: 'gdrive.credential' });
    this.oauthConfigCursor.observe({
      added: doc => this.updateOauthConfig(doc),
      changed: doc => this.updateOauthConfig(doc),
      removed: () => this.updateOauthConfig(undefined),
    });
    this.oauthCredentialCursor.observe({
      added: doc => this.updateOauthCredentials(doc),
      changed: doc => this.updateOauthCredentials(doc),
      removed: () => this.updateOauthCredentials({ value: {} }),
    });
  }

  updateOauthConfig(doc: Configuration | undefined) {
    this.oauthConfig = doc;
    this.recreateGdriveClient();
  }

  updateOauthCredentials(doc: SettingType & { name: 'gdrive.credential' }) {
    this.oauthRefreshToken = doc.value.refreshToken;
    this.recreateGdriveClient();
  }

  ready(): boolean {
    return !!this.gdrive;
  }

  recreateGdriveClient() {
    if (!this.oauthConfig || !this.oauthRefreshToken) {
      // Can't init if no config or long-lived refresh token
      this.gdrive = undefined;
      return;
    }

    // Construct a new OAuth2 client with the app id and secret and redirect uri
    this.oauthClient = new google.auth.OAuth2(
      (<any> this.oauthConfig).clientId,
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
