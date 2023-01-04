import DocumentActivities from '../../lib/models/DocumentActivities';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Migrations from './Migrations';

Migrations.add({
  version: 46,
  name: 'Collect per-user document activity',
  async up() {
    await DocumentActivities.createIndexAsync({
      document: 1,
      ts: 1,
      user: 1,
    }, { unique: true });
    await DocumentActivities.dropIndexAsync('document_1_ts_1');

    await MeteorUsers.createIndexAsync({ hunt: 1, googleAccountId: 1, createdAt: 1 });
  },
});
