import DiscordCache from '../../lib/models/DiscordCache';
import Migrations from './Migrations';

Migrations.add({
  version: 28,
  name: 'Create index for discord cache',
  up() {
    await DiscordCache.createIndexAsync({ type: 1, snowflake: 1 }, { unique: true });
  },
});
