import Subscribers from '../models/Subscribers';
import Migrations from './Migrations';

Migrations.add({
  version: 3,
  name: 'Add indexes for subscriber tracking',
  up() {
    Subscribers._ensureIndex({ server: 1 });
    Subscribers._ensureIndex({ name: 1 });
  },
});
