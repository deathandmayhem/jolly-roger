import FolderPermissions from '../../lib/models/FolderPermissions';
import Migrations from './Migrations';

Migrations.add({
  version: 35,
  name: 'Indexes for new FolderPermissions model',
  async up() {
    await FolderPermissions.createIndexAsync(
      { folder: 1, user: 1, googleAccount: 1 },
      { unique: true },
    );
  },
});
