import Documents from '../../lib/models/Documents';
import Migrations from './Migrations';

Migrations.add({
  version: 17,
  name: 'Backfill provider for documents',
  async up() {
    await Documents.updateAsync(<any>{ provider: null }, { $set: { provider: 'google' } }, { multi: true });

    await Documents.updateAsync(
      { type: 'google-spreadsheet', 'value.type': null } as any,
      { $set: { 'value.type': 'spreadsheet' }, $unset: { type: 1 } },
      { multi: true, bypassSchema: true }
    );
  },
});
