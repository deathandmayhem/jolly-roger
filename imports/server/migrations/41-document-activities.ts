import DocumentActivities from '../../lib/models/DocumentActivities';
import DocumentWatches from '../models/DocumentWatches';
import Migrations from './Migrations';

Migrations.add({
  version: 41,
  name: 'Add document activities collections and indexes',
  async up() {
    await DocumentActivities.createIndexAsync({ hunt: 1 });
    await DocumentActivities.createIndexAsync({ document: 1, ts: 1 }, { unique: true });
    await DocumentWatches.createIndexAsync({ document: 1 }, { unique: true });
    await DocumentWatches.createIndexAsync({ watchId: 1 });
  },
});
