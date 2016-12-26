import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 8,
  name: 'Add index for subscriptions server tracker',
  up() {
    Models.Servers._ensureIndex({ updatedAt: 1 });
  },
});
