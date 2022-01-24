import { Migrations } from 'meteor/percolate:migrations';
import Settings from '../../lib/models/Settings';

Migrations.add({
  version: 29,
  name: 'Remove leading _ on guild id field',
  up() {
    Settings.update(
      { name: 'discord.guild' },
      { $rename: { 'value.guild._id': 'value.guild.id' } },
      { multi: true },
    );
  },
});
