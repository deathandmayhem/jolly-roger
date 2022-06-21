import { Migrations } from 'meteor/percolate:migrations';
import Subscribers from '../models/Subscribers';

Migrations.add({
  version: 4,
  name: 'Fix indexes for subscriber tracking',
  up() {
    Subscribers._dropIndex('name_1');
    Subscribers._ensureIndex({ 'context.hunt': 1 });
  },
});
