import DocumentActivities from '../../lib/models/DocumentActivities';
import Migrations from './Migrations';

Migrations.add({
  version: 41,
  name: 'Add document activities collections and indexes',
  async up() {
    await DocumentActivities.createIndexAsync({ hunt: 1 });
    await DocumentActivities.createIndexAsync({ document: 1, ts: 1 }, { unique: true });
  },
});
