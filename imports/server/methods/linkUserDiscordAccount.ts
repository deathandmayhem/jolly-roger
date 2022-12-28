import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import Ansible from '../../Ansible';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Settings from '../../lib/models/Settings';
import linkUserDiscordAccount from '../../methods/linkUserDiscordAccount';
import addUsersToDiscordRole from '../addUsersToDiscordRole';
import { DiscordAPIClient, DiscordBot } from '../discord';

linkUserDiscordAccount.define({
  validate(arg) {
    check(arg, {
      key: String,
      secret: String,
    });
    return arg;
  },

  async run({ key, secret }) {
    check(this.userId, String);

    // Retrieve the OAuth token from the OAuth subsystem.
    const credential = OAuth.retrieveCredential(key, secret);
    Ansible.log('Linking user to Discord account', {
      user: this.userId,
    });

    // Save the user's credentials to their User object, under services.discord.
    await MeteorUsers.updateAsync(this.userId, {
      $set: {
        'services.discord': credential.serviceData,
      },
    });

    // Use OAuth token to retrieve user's identifier
    const { accessToken } = credential.serviceData;
    const apiClient = new DiscordAPIClient(accessToken);
    const userInfo = await apiClient.retrieveUserInfo();

    // Save user's id, identifier, and avatar to their profile.
    await MeteorUsers.updateAsync(this.userId, { $set: { discordAccount: userInfo } });

    // Invite the user to the guild, if one is configured.
    const discordGuildDoc = await Settings.findOneAsync({ name: 'discord.guild' });
    const guild = discordGuildDoc && discordGuildDoc.name === 'discord.guild' && discordGuildDoc.value.guild;

    const discordBotTokenDoc = await Settings.findOneAsync({ name: 'discord.bot' });
    const botToken = discordBotTokenDoc && discordBotTokenDoc.name === 'discord.bot' && discordBotTokenDoc.value.token;

    if (guild && botToken) {
      // Invitations to the guild must be performed by the bot user.
      const bot = new DiscordBot(botToken);
      // If the user is already in the guild, no need to add them again.
      const guildMember = await bot.getUserInGuild(userInfo.id, guild.id);
      if (!guildMember) {
        Ansible.log('Adding user to guild', {
          user: this.userId,
          discordUser: userInfo.id,
          guild: guild.id,
        });
        await bot.addUserToGuild(userInfo.id, accessToken, guild.id);
      } else {
        Ansible.log('User is already a member of guild', {
          user: this.userId,
          discordUser: userInfo.id,
          guild: guild.id,
        });
      }
    }

    await Meteor.user()!.hunts?.reduce(async (p, h) => {
      await p;
      await addUsersToDiscordRole([this.userId!], h);
    }, Promise.resolve());
  },
});
