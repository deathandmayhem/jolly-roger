import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 2,
  name: 'Add unique index to locks',
  up() {
    Models.Locks._ensureIndex({ name: 1 }, { unique: 1 });
  },
});
