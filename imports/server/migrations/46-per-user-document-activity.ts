import MeteorUsers from '../../lib/models/MeteorUsers';
import Migrations from './Migrations';

Migrations.add({
  version: 46,
  name: 'Collect per-user document activity',
  async up() {
    await MeteorUsers.createIndexAsync({ hunt: 1, googleAccountId: 1, createdAt: 1 });
  },
});
