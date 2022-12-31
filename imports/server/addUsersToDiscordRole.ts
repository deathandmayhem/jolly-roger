import Ansible from '../Ansible';
import Flags from '../Flags';
import Hunts from '../lib/models/Hunts';
import MeteorUsers from '../lib/models/MeteorUsers';
import Settings from '../lib/models/Settings';
import { DiscordBot } from './discord';

export default async (userIds: string[], huntId: string) => {
  if (Flags.active('disable.discord')) {
    Ansible.log('Can not add users to Discord role because Discord is disabled by feature flag', { userIds, huntId });
    return;
  }

  const discordGuildDoc = await Settings.findOneAsync({ name: 'discord.guild' });
  const guild = discordGuildDoc?.value.guild;

  const discordBotTokenDoc = await Settings.findOneAsync({ name: 'discord.bot' });
  const botToken = discordBotTokenDoc?.value.token;

  if (!guild || !botToken) {
    Ansible.log('Can not add users to Discord role because Discord is not configured', { userIds, huntId });
    return;
  }

  const hunt = await Hunts.findOneAsync(huntId);
  if (!hunt) {
    Ansible.log('Hunt does not exist', { huntId });
    return;
  }

  if (!hunt.memberDiscordRole) {
    Ansible.log('Can not add users to Discord role because hunt does not configure a Discord role', { userIds, huntId });
    return;
  }
  const roleId = hunt.memberDiscordRole.id;

  const discord = new DiscordBot(botToken);

  await userIds.reduce(async (p, userId) => {
    await p;

    const user = await MeteorUsers.findOneAsync(userId);
    if (!user?.discordAccount) {
      Ansible.log('Can not add users to Discord role because user has not linked their Discord account', { userIds, huntId });
      return;
    }
    try {
      await discord.addUserToRole(user.discordAccount.id, guild.id, roleId);
      Ansible.log('Successfully added user to Discord role', { userId, huntId, roleId });
    } catch (e) {
      Ansible.log('Error while adding user to Discord role', { err: e instanceof Error ? e.message : e });
    }
  }, Promise.resolve());
};
