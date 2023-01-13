import DiscordRoleGrants from '../../lib/models/DiscordRoleGrants';
import Migrations from './Migrations';

Migrations.add({
  version: 47,
  name: 'Add unique indexes to DiscordRoleGrants',
  async up() {
    await DiscordRoleGrants.createIndexAsync({
      guild: 1,
      role: 1,
      user: 1,
      discordAccountId: 1,
    }, { unique: true });
  },
});
