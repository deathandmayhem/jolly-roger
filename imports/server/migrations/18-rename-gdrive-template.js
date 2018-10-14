import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 18,
  name: 'Update the Google Spreadsheet template setting name',
  up() {
    Models.Settings._ensureIndex({ name: 1 }, { unique: 1 });

    Models.Settings.update(
      { name: 'gdrive.template' },
      { $set: { name: 'gdrive.template.spreadsheet' } }
    );
  },
});
