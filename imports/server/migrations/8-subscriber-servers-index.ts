import Servers from '../../lib/models/Servers';
import Migrations from './Migrations';

Migrations.add({
  version: 8,
  name: 'Add index for subscriptions server tracker',
  async up() {
    await Servers.createIndexAsync({ updatedAt: 1 });
  },
});
