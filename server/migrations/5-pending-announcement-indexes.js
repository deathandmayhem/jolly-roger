import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 5,
  name: 'Create indexes for pending announcements',
  up() {
    Models.PendingAnnouncements._ensureIndex({ user: 1 });
  },
});
