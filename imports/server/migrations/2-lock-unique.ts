import Locks from '../models/Locks';
import Migrations from './Migrations';

Migrations.add({
  version: 2,
  name: 'Add unique index to locks',
  up() {
    await Locks.createIndexAsync({ name: 1 }, { unique: true });
  },
});
