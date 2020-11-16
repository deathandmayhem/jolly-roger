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
    const postData = 'grant_type=client_credentials&scope=identify+connections';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const authString = `${clientId}:${clientSecret}`;
    const resp = HTTP.post(`${API_BASE}/oauth2/token`, {
      content: postData,
      headers,
      auth: authString,
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
});

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

  // Fetch guilds from Discord API.
  const bot = new DiscordBot(token);
  let guilds;
  try {
    guilds = bot.listGuilds();
  } catch (err) {
    Ansible.log('Sub to discord.guilds: discord remote error', { err });
    return [];
  }

  guilds.forEach((guild: any) => {
    this.added('discord.guilds', guild.id, { name: guild.name });
  });
  this.ready();
  // eslint-disable-next-line
  return;
});
