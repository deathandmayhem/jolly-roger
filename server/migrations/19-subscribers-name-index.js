import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 19,
  name: 'Create new index for subscribers.fetch subscription',
  up() {
    Models.Subscribers._ensureIndex({ name: 1 });
  },
});
