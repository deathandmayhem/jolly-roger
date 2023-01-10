import Flags from '../Flags';
import Logger from '../Logger';
import Hunts from '../lib/models/Hunts';
import MeteorUsers from '../lib/models/MeteorUsers';
import Settings from '../lib/models/Settings';
import { DiscordBot } from './discord';

export default async (userIds: string[], huntId: string) => {
  if (Flags.active('disable.discord')) {
    Logger.info('Can not add users to Discord role because Discord is disabled by feature flag', { userIds, huntId });
    return;
  }

  const discordGuildDoc = await Settings.findOneAsync({ name: 'discord.guild' });
  const guild = discordGuildDoc?.value.guild;

  const discordBotTokenDoc = await Settings.findOneAsync({ name: 'discord.bot' });
  const botToken = discordBotTokenDoc?.value.token;

  if (!guild || !botToken) {
    Logger.info('Can not add users to Discord role because Discord is not configured', { userIds, huntId });
    return;
  }

  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    Logger.info('Hunt does not exist', { huntId });
    return;
  }

  if (!hunt.memberDiscordRole) {
    Logger.info('Can not add users to Discord role because hunt does not configure a Discord role', { userIds, huntId });
    return;
  }
  const roleId = hunt.memberDiscordRole.id;

  const discord = new DiscordBot(botToken);

  for (const userId of userIds) {
    const user = await MeteorUsers.findOneAsync(userId);
    if (!user?.discordAccount) {
      Logger.info('Can not add users to Discord role because user has not linked their Discord account', { userIds, huntId });
      continue;
    }
    try {
      await discord.addUserToRole(user.discordAccount.id, guild.id, roleId);
      Logger.info('Successfully added user to Discord role', { userId, huntId, roleId });
    } catch (error) {
      Logger.warn('Error while adding user to Discord role', {
        error, userId, huntId, roleId,
      });
    }
  }
};
