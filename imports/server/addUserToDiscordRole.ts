import { Promise as MeteorPromise } from 'meteor/promise';
import Ansible from '../ansible';
import Flags from '../flags';
import Hunts from '../lib/models/hunts';
import Profiles from '../lib/models/profiles';
import Settings from '../lib/models/settings';
import { DiscordBot } from './discord';

export default (userId: string, huntId: string) => {
  if (Flags.active('disable.discord')) {
    Ansible.log('Can not add user to Discord role because Discord is disabled by feature flag', { userId, huntId });
  }

  const discordGuildDoc = Settings.findOne({ name: 'discord.guild' });
  const guild = discordGuildDoc && discordGuildDoc.name === 'discord.guild' && discordGuildDoc.value.guild;

  const discordBotTokenDoc = Settings.findOne({ name: 'discord.bot' });
  const botToken = discordBotTokenDoc && discordBotTokenDoc.name === 'discord.bot' && discordBotTokenDoc.value.token;

  if (!guild || !botToken) {
    Ansible.log('Can not add user to Discord role because Discord is not configured', { userId, huntId });
    return;
  }

  const profile = Profiles.findOne(userId);
  if (!profile) {
    Ansible.log('Can not add user to Discord role because user has no profile', { userId, huntId });
    return;
  }

  if (!profile.discordAccount) {
    Ansible.log('Can not add user to Discord role because user has not linked their Discord account', { userId, huntId });
    return;
  }

  const hunt = Hunts.findOne(huntId);
  if (!hunt) {
    Ansible.log('Hunt does not exist', { huntId });
    return;
  }

  if (!hunt.memberDiscordRole) {
    Ansible.log('Can not add user to Discord role because hunt does not configure a Discord role', { userId, huntId });
    return;
  }
  const roleId = hunt.memberDiscordRole.id;

  const discord = new DiscordBot(botToken);
  try {
    MeteorPromise.await(discord.addUserToRole(profile.discordAccount.id, guild.id, roleId));
    Ansible.log('Successfully added user to Discord role', { userId, huntId, roleId });
  } catch (e) {
    Ansible.log('Error while adding user to Discord role', { err: e.message });
  }
};
