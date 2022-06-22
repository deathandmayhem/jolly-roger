import Subscribers from '../models/Subscribers';
import Migrations from './Migrations';

Migrations.add({
  version: 4,
  name: 'Fix indexes for subscriber tracking',
  up() {
    Subscribers._dropIndex('name_1');
    Subscribers._ensureIndex({ 'context.hunt': 1 });
  },
});
