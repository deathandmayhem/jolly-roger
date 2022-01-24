import { Migrations } from 'meteor/percolate:migrations';
import Subscribers from '../models/Subscribers';

Migrations.add({
  version: 3,
  name: 'Add indexes for subscriber tracking',
  up() {
    Subscribers._ensureIndex({ server: 1 });
    Subscribers._ensureIndex({ name: 1 });
  },
});
