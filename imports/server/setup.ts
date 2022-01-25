import { Accounts } from 'meteor/accounts-base';
import { Match, check } from 'meteor/check';
import { fetch } from 'meteor/fetch';
import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import { Random } from 'meteor/random';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { _ } from 'meteor/underscore';
import Ansible from '../Ansible';
import { API_BASE } from '../lib/discord';
import { GLOBAL_SCOPE } from '../lib/is-admin';
import Documents from '../lib/models/Documents';
import Hunts from '../lib/models/Hunts';
import MeteorUsers from '../lib/models/MeteorUsers';
import Puzzles from '../lib/models/Puzzles';
import Settings from '../lib/models/Settings';
import {
  addUserToRole,
  userMayConfigureGdrive,
  userMayConfigureGoogleOAuth,
  userMayConfigureDiscordOAuth,
  userMayConfigureDiscordBot,
  userMayConfigureTeamName,
  userMayConfigureEmailBranding,
  userMayConfigureAssets,
} from '../lib/permission_stubs';
import { SettingType } from '../lib/schemas/Setting';
import { ensureDocument, ensureHuntFolder, moveDocument } from './gdrive';
import HuntFolders from './models/HuntFolders';
import UploadTokens from './models/UploadTokens';

// Clean up upload tokens that didn't get used within a minute
function cleanupUploadTokens() {
  const oldestValidTime = new Date(Date.now() - 60 * 1000);
  UploadTokens.remove({ createdAt: { $lt: oldestValidTime } });
}
function periodic() {
  Meteor.setTimeout(periodic, 15000 + (15000 * Random.fraction()));
  cleanupUploadTokens();
}
Meteor.startup(() => periodic());

Meteor.methods({
  provisionFirstUser(email: unknown, password: unknown) {
    // Allow creating the first user and making them an admin by virtue of
    // being the first to show up at the server and call this method.  Assume
    // that if someone else beats you to this on your own infra, you'll burn
    // it to the ground and try again.
    check(email, String);
    check(password, String);

    // Refuse to create the user if any users already exist
    // This is theoretically racy but is probably fine in practice
    const existingUser = MeteorUsers.findOne({});
    if (existingUser) {
      throw new Meteor.Error(403, 'The first user already exists.');
    }

    const firstUserId = Accounts.createUser({ email, password });
    addUserToRole(firstUserId, GLOBAL_SCOPE, 'admin');
  },

  setupGoogleOAuthClient(clientId: unknown, secret: unknown) {
    check(this.userId, String);
    check(clientId, String);
    check(secret, String);
    if (!userMayConfigureGoogleOAuth(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Google OAuth');
    }

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

  setupGdriveCreds(key: unknown, secret: unknown) {
    check(this.userId, String);
    check(key, String);
    check(secret, String);
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    const credential = Google.retrieveCredential(key, secret);
    const { refreshToken, email } = credential.serviceData;
    Ansible.log('Updating Gdrive creds', {
      email,
      user: this.userId,
    });
    Settings.upsert(
      { name: 'gdrive.credential' },
      { $set: { value: { refreshToken, email } } }
    );
  },

  clearGdriveCreds() {
    check(this.userId, String);
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }
    Ansible.log('Clearing Gdrive creds', {
      user: this.userId,
    });
    Settings.remove({ name: 'gdrive.credential' });
  },

  setupGdriveRoot(root: unknown) {
    check(this.userId, String);
    check(root, Match.Maybe(String));
    // Only let the same people that can credential gdrive configure root folder,
    // which today is just admins
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    if (root) {
      Settings.upsert(
        { name: 'gdrive.root' },
        { $set: { value: { id: root } } }
      );
    } else {
      Settings.remove({ name: 'gdrive.root' });
    }
  },

  reorganizeGoogleDrive() {
    check(this.userId, String);

    // Only let the same people that can credential gdrive reorganize files,
    // which today is just admins
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    Ansible.log('Reorganizing Google Drive files');

    // First make sure any existing folders are under the root
    const root = Settings.findOne({ name: 'gdrive.root' }) as SettingType & { name: 'gdrive.root' } | undefined;
    if (root) {
      HuntFolders.find().forEach((hf) => {
        moveDocument(hf.folder, root.value.id);
      });
    }

    // Then create folders for any hunt that doesn't currently have one
    Hunts.find().forEach((h) => {
      ensureHuntFolder(h);
    });

    // Finally move all existing documents into the right folder
    const puzzles = _.indexBy(Puzzles.find().fetch(), '_id');
    Documents.find().forEach((d) => {
      const puzzle = puzzles[d.puzzle];
      if (puzzle && !d.value.folder) ensureDocument(puzzle);
    });
  },

  setupGdriveTemplates(spreadsheetTemplate: unknown, documentTemplate: unknown) {
    check(this.userId, String);
    check(spreadsheetTemplate, Match.Maybe(String));
    check(documentTemplate, Match.Maybe(String));
    // Only let the same people that can credential gdrive configure templates,
    // which today is just admins
    if (!userMayConfigureGdrive(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure gdrive');
    }

    // In an ideal world, maybe we'd verify that the document IDs we were given
    // are actually like valid documents that we can reach or something.
    if (spreadsheetTemplate) {
      Settings.upsert(
        { name: 'gdrive.template.spreadsheet' },
        { $set: { value: { id: spreadsheetTemplate } } }
      );
    } else {
      Settings.remove({ name: 'gdrive.template.spreadsheet' });
    }

    if (documentTemplate) {
      Settings.upsert(
        { name: 'gdrive.template.document' },
        { $set: { value: { id: documentTemplate } } }
      );
    } else {
      Settings.remove({ name: 'gdrive.template.document' });
    }
  },

  setupDiscordOAuthClient(clientId: unknown, clientSecret: unknown) {
    check(this.userId, String);
    check(clientId, String);
    check(clientSecret, String);
    if (!userMayConfigureDiscordOAuth(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Discord OAuth');
    }

    if (!clientId && !clientSecret) {
      Ansible.log('Disabling discord oauth client', {
        user: this.userId,
      });
      ServiceConfiguration.configurations.remove({ service: 'discord' });
      return;
    }

    Ansible.log('Configuring discord oauth client', {
      clientId,
      user: this.userId,
    });

    // Test the client id/secret.
    const resp = MeteorPromise.await(fetch(`${API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'identify',
      }),
    }));

    if (resp.ok) {
      ServiceConfiguration.configurations.upsert({ service: 'discord' }, {
        $set: {
          appId: clientId,
          secret: clientSecret,
          loginStyle: 'popup',
        },
      });
    } else {
      const text = MeteorPromise.await(resp.text());
      throw new Meteor.Error(`Discord credential test failed: ${text}`);
    }
  },

  setupDiscordBotToken(token: unknown) {
    check(this.userId, String);
    check(token, String);
    if (!userMayConfigureDiscordBot(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Discord Bot');
    }

    if (token) {
      Ansible.log('Configuring discord bot token (token redacted)', {
        user: this.userId,
      });
      Settings.upsert(
        { name: 'discord.bot' },
        { $set: { 'value.token': token } }
      );
    } else {
      Ansible.log('Discarding discord bot token', {
        user: this.userId,
      });
      Settings.remove({ name: 'discord.bot' });
    }
  },

  setupDiscordBotGuild(guild: unknown) {
    check(this.userId, String);
    if (!userMayConfigureDiscordBot(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Discord Bot');
    }
    check(guild, Match.Maybe({
      id: String,
      name: String,
    }));

    if (guild) {
      Ansible.log('Configuring discord bot guild', {
        user: this.userId,
        ...guild,
      });
      Settings.upsert({ name: 'discord.guild' }, {
        $set: { 'value.guild': guild },
      });
    } else {
      Settings.remove({ name: 'discord.guild' });
    }
  },

  setupSetTeamName(teamName: unknown) {
    check(this.userId, String);
    if (!userMayConfigureTeamName(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure team name');
    }
    check(teamName, Match.Maybe(String));
    if (teamName) {
      Settings.upsert({ name: 'teamname' }, {
        $set: {
          value: {
            teamName,
          },
        },
      });
    } else {
      Settings.remove({ name: 'teamname' });
    }
  },

  setupEmailBranding(
    from: unknown,
    enrollSubject: unknown,
    enrollMessage: unknown,
    joinSubject: unknown,
    joinMessage: unknown
  ) {
    check(this.userId, String);
    if (!userMayConfigureEmailBranding(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure email branding');
    }
    check(from, Match.Optional(String));
    check(enrollSubject, Match.Optional(String));
    check(enrollMessage, Match.Optional(String));
    check(joinSubject, Match.Optional(String));
    check(joinMessage, Match.Optional(String));

    const value = {
      from: from || undefined,
      enrollAccountMessageSubjectTemplate: enrollSubject || undefined,
      enrollAccountMessageTemplate: enrollMessage || undefined,
      existingJoinMessageSubjectTemplate: joinSubject || undefined,
      existingJoinMessageTemplate: joinMessage || undefined,
    };

    Settings.upsert({ name: 'email.branding' }, {
      $set: {
        name: 'email.branding',
        value,
      },
    });
  },

  setupGetUploadToken(assetName: unknown, assetMimeType: unknown) {
    check(this.userId, String);
    if (!userMayConfigureAssets(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure branding assets');
    }
    check(assetName, String);
    check(assetMimeType, String);
    const token = UploadTokens.insert({ asset: assetName, mimeType: assetMimeType });
    return token;
  },
});

Meteor.publish('hasUsers', function () {
  // Publish a pseudo-collection which just communicates if there are any users
  // at all, so we can either guide users through the server setup flow or just
  // point them at the login page.
  const cursor = MeteorUsers.find();
  if (cursor.count() > 0) {
    this.added('hasUsers', 'hasUsers', { hasUsers: true });
  } else {
    let handle: Meteor.LiveQueryHandle | undefined = cursor.observeChanges({
      added: (_id) => {
        this.added('hasUsers', 'hasUsers', { hasUsers: true });
        if (handle) {
          handle.stop();
        }
        handle = undefined;
      },
    });
    this.onStop(() => {
      if (handle) {
        handle.stop();
      }
    });
  }

  this.ready();
});

Meteor.publish('teamName', function () {
  const cursor = Settings.find({ name: 'teamname' });
  let tracked = false;
  const handle: Meteor.LiveQueryHandle = cursor.observe({
    added: (doc) => {
      if (doc.name === 'teamname' && doc.value && doc.value.teamName) {
        tracked = true;
        this.added('teamName', 'teamName', { name: doc.value.teamName });
      }
    },
    changed: (newDoc) => {
      if (newDoc.name === 'teamname' && newDoc.value.teamName) {
        this.changed('teamName', 'teamName', { name: newDoc.value.teamName });
      }
    },
    removed: () => {
      if (tracked) {
        this.removed('teamName', 'teamName');
      }
    },
  });
  this.onStop(() => {
    handle.stop();
  });

  this.ready();
});
