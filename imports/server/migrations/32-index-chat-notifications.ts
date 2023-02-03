import Migrations from './Migrations';

Migrations.add({
  version: 32,
  name: 'Add indexes on ChatNotifications',
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
