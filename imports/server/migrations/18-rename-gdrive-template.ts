import { Migrations } from 'meteor/percolate:migrations';
import Settings from '../../lib/models/Settings';

Migrations.add({
  version: 18,
  name: 'Update the Google Spreadsheet template setting name',
  up() {
    Settings._ensureIndex({ name: 1 }, { unique: 1 });

    Settings.update(
      <any>{ name: 'gdrive.template' },
      { $set: { name: 'gdrive.template.spreadsheet' } }
    );
  },
});
