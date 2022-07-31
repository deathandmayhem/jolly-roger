import Locks from '../models/Locks';
import Migrations from './Migrations';

Migrations.add({
  version: 2,
  name: 'Add unique index to locks',
  up() {
    Locks.createIndex({ name: 1 }, { unique: true });
  },
});
