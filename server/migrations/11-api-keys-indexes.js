import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 11,
  name: 'Add indexes for API keys',
  up() {
    Models.APIKeys._ensureIndex({ key: 1 });
  },
});
