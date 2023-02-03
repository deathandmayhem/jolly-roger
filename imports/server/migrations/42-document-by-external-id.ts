import Migrations from './Migrations';

Migrations.add({
  version: 42,
  name: 'Index for finding documents by external id',
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
