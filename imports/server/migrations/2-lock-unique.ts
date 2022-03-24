import Locks from '../models/Locks';
import Migrations from './Migrations';

Migrations.add({
  version: 2,
  name: 'Add unique index to locks',
  up() {
    Locks._ensureIndex({ name: 1 }, { unique: 1 });
  },
});
