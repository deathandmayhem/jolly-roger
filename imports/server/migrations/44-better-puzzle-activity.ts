import Migrations from './Migrations';

Migrations.add({
  version: 44,
  name: 'Indexes for puzzle activity tracking',
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
