import Migrations from './Migrations';

Migrations.add({
  version: 16,
  name: 'Create index for feature flags',
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
