import { Mongo } from 'meteor/mongo';
import { OAuth } from 'meteor/oauth';
import { ServiceConfiguration, Configuration } from 'meteor/service-configuration';
import { drive_v3, drive } from '@googleapis/drive';
import { driveactivity, driveactivity_v2 } from '@googleapis/driveactivity';
import { people, people_v1 } from '@googleapis/people';
import { script_v1, script } from '@googleapis/script';
import { OAuth2Client } from 'google-auth-library';
import Settings from '../lib/models/Settings';
import { SettingType } from '../lib/schemas/Setting';

class GoogleClientRefresher {
  public drive?: drive_v3.Drive;

  public driveactivity?: driveactivity_v2.Driveactivity;

  public script?: script_v1.Script;

  public people?: people_v1.People;

  private oauthClient?: OAuth2Client;

  private oauthConfig?: Configuration;

  private oauthRefreshToken?: string;

  private oauthConfigCursor: Mongo.Cursor<Configuration>;

  private oauthCredentialCursor: Mongo.Cursor<SettingType>;

  constructor() {
    this.drive = undefined;
    this.oauthClient = undefined;
    this.oauthConfig = undefined;
    this.oauthRefreshToken = undefined;

    // Watch for config changes, and refresh the gdrive instance if anything changes
    this.oauthConfigCursor = ServiceConfiguration.configurations.find({ service: 'google' });
    this.oauthCredentialCursor = Settings.find({ name: 'gdrive.credential' });
    this.oauthConfigCursor.observe({
      added: (doc) => this.updateOauthConfig(doc),
      changed: (doc) => this.updateOauthConfig(doc),
      removed: () => this.updateOauthConfig(undefined),
    });
    this.oauthCredentialCursor.observe({
      added: (doc) => this.updateOauthCredentials(doc),
      changed: (doc) => this.updateOauthCredentials(doc),
      removed: () => this.clearOauthCredentials(),
    });
  }

  updateOauthConfig(doc: Configuration | undefined) {
    this.oauthConfig = doc;
    this.recreateGoogleClient();
  }

  updateOauthCredentials(doc: SettingType) {
    if (doc.name !== 'gdrive.credential') {
      return; // this should be impossible
    }
    this.oauthRefreshToken = doc.value.refreshToken;
    this.recreateGoogleClient();
  }

  clearOauthCredentials() {
    this.oauthRefreshToken = undefined;
    this.recreateGoogleClient();
  }

  ready(): boolean {
    return !!this.drive;
  }

  recreateGoogleClient() {
    if (!this.oauthConfig || !this.oauthRefreshToken) {
      // Can't init if no config or long-lived refresh token
      this.drive = undefined;
      return;
    }

    // Construct a new OAuth2 client with the app id and secret and redirect uri
    this.oauthClient = new OAuth2Client(
      (<any> this.oauthConfig).clientId,
      this.oauthConfig.secret,
      OAuth._redirectUri('google', this.oauthConfig)
    );

    // Set the refresh token for that client
    this.oauthClient.setCredentials({
      refresh_token: this.oauthRefreshToken,
    });

    // Construct the clients, using that OAuth2 client.
    this.drive = drive({ version: 'v3', auth: this.oauthClient });
    this.driveactivity = driveactivity({ version: 'v2', auth: this.oauthClient });
    this.script = script({ version: 'v1', auth: this.oauthClient });
    this.people = people({ version: 'v1', auth: this.oauthClient });
  }
}

const googleClientRefresher = new GoogleClientRefresher();

export default googleClientRefresher;
