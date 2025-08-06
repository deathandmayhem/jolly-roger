import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { OAuth } from "meteor/oauth";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import linkUserDiscordAccount from "../../methods/linkUserDiscordAccount";
import addUsersToDiscordRole from "../addUsersToDiscordRole";
import { DiscordAPIClient, DiscordBot } from "../discord";
import defineMethod from "./defineMethod";

defineMethod(linkUserDiscordAccount, {
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
    const credential = await OAuth.retrieveCredential(key, secret);
    Logger.info("Linking user to Discord account");

    // Save the user's credentials to their User object, under services.discord.
    await MeteorUsers.updateAsync(this.userId, {
      $set: {
        "services.discord": credential.serviceData,
      },
    });

    // Use OAuth token to retrieve user's identifier
    const { accessToken } = credential.serviceData;
    const apiClient = new DiscordAPIClient(accessToken);
    const userInfo = await apiClient.retrieveUserInfo();

    // Save user's id, identifier, and avatar to their profile.
    await MeteorUsers.updateAsync(this.userId, {
      $set: { discordAccount: userInfo },
    });

    // Invite the user to the guild, if one is configured.
    const discordGuildDoc = await Settings.findOneAsync({
      name: "discord.guild",
    });
    const guild = discordGuildDoc?.value.guild;

    const discordBotTokenDoc = await Settings.findOneAsync({
      name: "discord.bot",
    });
    const botToken = discordBotTokenDoc?.value.token;

    if (guild && botToken) {
      // Invitations to the guild must be performed by the bot user.
      const bot = new DiscordBot(botToken);
      // If the user is already in the guild, no need to add them again.
      const guildMember = await bot.getUserInGuild(userInfo.id, guild.id);
      if (!guildMember) {
        Logger.info("Adding user to guild", {
          discordUser: userInfo.id,
          guild: guild.id,
        });
        await bot.addUserToGuild(userInfo.id, accessToken, guild.id);
      } else {
        Logger.info("User is already a member of guild", {
          discordUser: userInfo.id,
          guild: guild.id,
        });
      }
    }

    for (const h of (await Meteor.userAsync())!.hunts ?? []) {
      await addUsersToDiscordRole([this.userId], h);
    }
  },
});
