import { check } from 'meteor/check';
import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { Promise as MeteorPromise } from 'meteor/promise';
import Ansible from '../Ansible';
import Flags from '../Flags';
import MeteorUsers from '../lib/models/MeteorUsers';
import Settings from '../lib/models/Settings';
import addUserToDiscordRole from './addUserToDiscordRole';
import { DiscordAPIClient, DiscordBot } from './discord';
import { ensureHuntFolderPermission } from './gdrive';

Meteor.methods({
  saveProfile(newProfile: unknown) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);
    check(newProfile, {
      displayName: String,
      phoneNumber: String,
      muteApplause: Boolean,
      dingwords: [String],
    });
    Ansible.log('Updating profile for user', { user: this.userId });
    MeteorUsers.update({
      _id: this.userId,
    }, {
      $set: {
        'profile.displayName': newProfile.displayName,
        'profile.phoneNumber': newProfile.phoneNumber,
        'profile.muteApplause': newProfile.muteApplause,
        'profile.dingwords': newProfile.dingwords,
      },
    });
  },

  linkUserGoogleAccount(key: unknown, secret: unknown) {
    check(this.userId, String);
    check(key, String);
    check(secret, String);

    // We don't care about actually capturing the credential - we're
    // not going to do anything with it (and with only identity
    // scopes, I don't think you can do anything with it), but we do
    // want to validate it.
    const credential = Google.retrieveCredential(key, secret);
    const email = credential.serviceData.email;
    Ansible.log('Linking user to Google account', {
      user: this.userId,
      email,
    });

    MeteorUsers.update(this.userId, { $set: { 'profile.googleAccount': email } });

    if (!Flags.active('disable.google') && !Flags.active('disable.gdrive_permissions')) {
      const hunts = Meteor.user()!.hunts;
      hunts?.forEach((huntId) => {
        ensureHuntFolderPermission(huntId, this.userId!, email);
      });
    }
  },

  unlinkUserGoogleAccount() {
    check(this.userId, String);
    MeteorUsers.update(this.userId, { $unset: { 'profile.googleAccount': 1 } });
  },

  linkUserDiscordAccount(key: unknown, secret: unknown) {
    check(this.userId, String);
    check(key, String);
    check(secret, String);

    // Retrieve the OAuth token from the OAuth subsystem.
    const credential = OAuth.retrieveCredential(key, secret);
    Ansible.log('Linking user to Discord account', {
      user: this.userId,
    });

    // Save the user's credentials to their User object, under services.discord.
    MeteorUsers.update(this.userId, {
      $set: {
        'services.discord': credential.serviceData,
      },
    });

    // Use OAuth token to retrieve user's identifier
    const { accessToken } = credential.serviceData;
    const apiClient = new DiscordAPIClient(accessToken);
    const userInfo = MeteorPromise.await(apiClient.retrieveUserInfo());

    // Save user's id, identifier, and avatar to their profile.
    MeteorUsers.update(this.userId, { $set: { 'profile.discordAccount': userInfo } });

    // Invite the user to the guild, if one is configured.
    const discordGuildDoc = Settings.findOne({ name: 'discord.guild' });
    const guild = discordGuildDoc && discordGuildDoc.name === 'discord.guild' && discordGuildDoc.value.guild;

    const discordBotTokenDoc = Settings.findOne({ name: 'discord.bot' });
    const botToken = discordBotTokenDoc && discordBotTokenDoc.name === 'discord.bot' && discordBotTokenDoc.value.token;

    if (guild && botToken) {
      // Invitations to the guild must be performed by the bot user.
      const bot = new DiscordBot(botToken);
      // If the user is already in the guild, no need to add them again.
      const guildMember = MeteorPromise.await(bot.getUserInGuild(userInfo.id, guild.id));
      if (!guildMember) {
        Ansible.log('Adding user to guild', {
          user: this.userId,
          discordUser: userInfo.id,
          guild: guild.id,
        });
        MeteorPromise.await(bot.addUserToGuild(userInfo.id, accessToken, guild.id));
      } else {
        Ansible.log('User is already a member of guild', {
          user: this.userId,
          discordUser: userInfo.id,
          guild: guild.id,
        });
      }
    }

    Meteor.user()!.hunts?.forEach((h) => {
      addUserToDiscordRole(this.userId!, h);
    });
  },

  unlinkUserDiscordAccount() {
    check(this.userId, String);

    // TODO: tell Discord to revoke the token?

    // Remove token (secret) from the user object in the database.
    MeteorUsers.update(this.userId, {
      $unset: { 'services.discord': '' },
    });

    // Remove display name from user's profile object.
    MeteorUsers.update(this.userId, { $unset: { 'profile.discordAccount': 1 } });
  },
});
