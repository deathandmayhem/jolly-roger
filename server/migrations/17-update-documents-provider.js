import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 17,
  name: 'Backfill provider for documents',
  up() {
    Models.Documents.update({ provider: null }, { $set: { provider: 'google' } }, { multi: true });

    Models.Documents.update(
      { type: 'google-spreadsheet', 'value.type': null },
      { $set: { 'value.type': 'spreadsheet' }, $unset: { type: 1 } },
      { multi: true, validate: false }
    );
  },
});
