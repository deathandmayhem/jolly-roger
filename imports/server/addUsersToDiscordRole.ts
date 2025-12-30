import { setTimeout } from "node:timers/promises";
import Flags from "../Flags";
import Logger from "../Logger";
import DiscordRoleGrants from "../lib/models/DiscordRoleGrants";
import Hunts from "../lib/models/Hunts";
import MeteorUsers from "../lib/models/MeteorUsers";
import Settings from "../lib/models/Settings";
import { DiscordBot } from "./discord";

export default async (
  userIds: string[],
  huntId: string,
  { force = true }: { force?: boolean } = {},
) => {
  if (await Flags.activeAsync("disable.discord")) {
    Logger.info(
      "Can not add users to Discord role because Discord is disabled by feature flag",
      { userIds, huntId },
    );
    return;
  }

  const discordGuildDoc = await Settings.findOneAsync({
    name: "discord.guild",
  });
  const guild = discordGuildDoc?.value.guild;

  const discordBotTokenDoc = await Settings.findOneAsync({
    name: "discord.bot",
  });
  const botToken = discordBotTokenDoc?.value.token;

  if (!guild || !botToken) {
    Logger.info(
      "Can not add users to Discord role because Discord is not configured",
      { userIds, huntId },
    );
    return;
  }

  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    Logger.info("Hunt does not exist", { huntId });
    return;
  }

  if (!hunt.memberDiscordRole) {
    Logger.info(
      "Can not add users to Discord role because hunt does not configure a Discord role",
      { userIds, huntId },
    );
    return;
  }
  const roleId = hunt.memberDiscordRole.id;

  const discord = new DiscordBot(botToken);

  for (const userId of userIds) {
    const user = await MeteorUsers.findOneAsync(userId);
    if (!user?.discordAccount) {
      Logger.info(
        "Can not add users to Discord role because user has not linked their Discord account",
        { userId, huntId },
      );
      continue;
    }

    if (
      !force &&
      (await DiscordRoleGrants.findOneAsync({
        guild: guild.id,
        role: roleId,
        user: userId,
        discordAccountId: user.discordAccount.id,
      }))
    ) {
      Logger.info("User already has Discord role", { userId, huntId, roleId });
      continue;
    }

    try {
      await discord.addUserToRole(user.discordAccount.id, guild.id, roleId);
      Logger.info("Successfully added user to Discord role", {
        userId,
        huntId,
        roleId,
      });
      // Upsert so that if the record already exists we'll touch updatedAt
      await DiscordRoleGrants.upsertAsync(
        {
          guild: guild.id,
          role: roleId,
          user: userId,
          discordAccountId: user.discordAccount.id,
        },
        {},
      );

      // Discord seems to start rate limiting at around 20 requests per second;
      // to be safe, we'll limit to 2 per second
      await setTimeout(500);
    } catch (error) {
      Logger.warn("Error while adding user to Discord role", {
        error,
        userId,
        huntId,
        roleId,
      });
    }
  }
};
