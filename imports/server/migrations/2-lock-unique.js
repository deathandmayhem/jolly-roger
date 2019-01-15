import { Migrations } from 'meteor/percolate:migrations';
import Locks from '../models/lock';

Migrations.add({
  version: 2,
  name: 'Add unique index to locks',
  up() {
    Locks._ensureIndex({ name: 1 }, { unique: 1 });
  },
});
