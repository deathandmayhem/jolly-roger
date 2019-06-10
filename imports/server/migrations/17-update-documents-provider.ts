import { Migrations } from 'meteor/percolate:migrations';
import Documents from '../../lib/models/documents';

Migrations.add({
  version: 17,
  name: 'Backfill provider for documents',
  up() {
    Documents.update({ provider: null }, { $set: { provider: 'google' } }, { multi: true });

    Documents.update(
      { type: 'google-spreadsheet', 'value.type': null },
      { $set: { 'value.type': 'spreadsheet' }, $unset: { type: 1 } },
      <any>{ multi: true, validate: false }
    );
  },
});
