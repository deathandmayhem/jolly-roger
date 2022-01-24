import { Migrations } from 'meteor/percolate:migrations';
import DiscordCache from '../../lib/models/DiscordCache';

Migrations.add({
  version: 28,
  name: 'Create index for discord cache',
  up() {
    DiscordCache._ensureIndex({ type: 1, snowflake: 1 }, { unique: true });
  },
});
