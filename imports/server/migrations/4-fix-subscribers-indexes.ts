import { Migrations } from 'meteor/percolate:migrations';
import Subscribers from '../models/subscribers';

Migrations.add({
  version: 4,
  name: 'Fix indexes for subscriber tracking',
  up() {
    Subscribers._dropIndex({ name: 1 });
    Subscribers._ensureIndex({ 'context.hunt': 1 });
  },
});
