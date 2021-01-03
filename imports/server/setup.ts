import { Accounts } from 'meteor/accounts-base';
import { Match, check } from 'meteor/check';
import { Google } from 'meteor/google-oauth';
import { HTTP } from 'meteor/http';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/nicolaslopezj:roles';
import { ServiceConfiguration } from 'meteor/service-configuration';
import Ansible from '../ansible';
import { API_BASE } from '../lib/discord';
import Settings from '../lib/models/settings';
import { DiscordBot } from './discord';

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
    const existingUser = Meteor.users.findOne({});
    if (existingUser) {
      throw new Meteor.Error(403, 'The first user already exists.');
    }

    const firstUserId = Accounts.createUser({ email, password });
    Roles.addUserToRoles(firstUserId, ['admin', 'operator']);
  },

  setupGoogleOAuthClient(clientId: unknown, secret: unknown) {
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

  setupGdriveCreds(key: unknown, secret: unknown) {
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

  setupGdriveTemplates(spreadsheetTemplate: unknown, documentTemplate: unknown) {
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

  setupDiscordOAuthClient(clientId: unknown, clientSecret: unknown) {
    check(this.userId, String);
    check(clientId, String);
    check(clientSecret, String);
    Roles.checkPermission(this.userId, 'discord.configureOAuth');

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
    const authString = `${clientId}:${clientSecret}`;
    const resp = HTTP.post(`${API_BASE}/oauth2/token`, {
      auth: authString,
      params: {
        grant_type: 'client_credentials',
        scope: 'identify',
      },
    });

    if (resp.statusCode === 200) {
      ServiceConfiguration.configurations.upsert({ service: 'discord' }, {
        $set: {
          appId: clientId,
          secret: clientSecret,
          loginStyle: 'popup',
        },
      });
    } else {
      throw new Meteor.Error('Discord credential test failed');
    }
  },

  setupDiscordBotToken(token: unknown) {
    check(this.userId, String);
    check(token, String);
    Roles.checkPermission(this.userId, 'discord.configureBot');

    if (token) {
      Ansible.log('Configuring discord bot token (token redacted)', {
        user: this.userId,
      });
      Settings.upsert({ name: 'discord.bot' },
        { $set: { 'value.token': token } });
    } else {
      Ansible.log('Discarding discord bot token', {
        user: this.userId,
      });
      Settings.remove({ name: 'discord.bot' });
    }
  },

  setupDiscordBotGuild(guild: unknown) {
    check(this.userId, String);
    Roles.checkPermission(this.userId, 'discord.configureBot');
    check(guild, Match.Maybe({
      _id: String,
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

  setupTurnServerConfig(secret: unknown, urls: unknown) {
    check(this.userId, String);
    Roles.checkPermission(this.userId, 'webrtc.configureServers');
    check(secret, String);
    check(urls, [String]);

    if (secret || urls.length > 0) {
      Settings.upsert({ name: 'webrtc.turnserver' }, {
        $set: {
          'value.secret': secret,
          'value.urls': urls,
        },
      });
    } else {
      Settings.remove({ name: 'webrtc.turnserver' });
    }
  },
});

Meteor.publish('hasUsers', function () {
  // Publish a pseudo-collection which just communicates if there are any users
  // at all, so we can either guide users through the server setup flow or just
  // point them at the login page.
  const cursor = Meteor.users.find();
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

const cacheDuration = 5000; // Cache guild listings for 5 seconds to avoid hitting ratelimits
let cachedDiscordGuildsTimestamp = 0;
let cachedDiscordGuilds: any[] = [];

Meteor.publish('discord.guilds', function () {
  // Only allow admins to list guilds
  if (!this.userId || !Roles.userHasPermission(this.userId, 'discord.configureBot')) {
    Ansible.log('Sub to discord.guilds not logged in as admin');
    return [];
  }

  const botSettings = Settings.findOne({ name: 'discord.bot' });
  if (!botSettings || botSettings.name !== 'discord.bot') {
    Ansible.log('Sub to discord.guilds: no bot settings');
    return [];
  }

  const token = botSettings.value && botSettings.value.token;
  if (!token) {
    Ansible.log('Sub to discord.guilds: no bot token');
    return [];
  }

  if (Date.now() > cachedDiscordGuildsTimestamp + cacheDuration) {
    // Fetch guilds from Discord API.
    const bot = new DiscordBot(token);
    try {
      cachedDiscordGuilds = bot.listGuilds();
      cachedDiscordGuildsTimestamp = Date.now();
    } catch (err) {
      Ansible.log('Sub to discord.guilds: discord remote error', { err: JSON.stringify(err) });
      return [];
    }
  }

  cachedDiscordGuilds.forEach((guild: any) => {
    this.added('discord.guilds', guild.id, { name: guild.name });
  });
  this.ready();
  // eslint-disable-next-line
  return;
});
