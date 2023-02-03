import Migrations from './Migrations';

Migrations.add({
  version: 35,
  name: 'Indexes for new FolderPermissions model',
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
