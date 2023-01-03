import FolderPermissions from '../../lib/models/FolderPermissions';
import Migrations from './Migrations';

Migrations.add({
  version: 45,
  name: 'Add permission level to FolderPermissions index',
  async up() {
    await FolderPermissions.createIndexAsync({
      folder: 1,
      user: 1,
      googleAccount: 1,
      permissionLevel: 1,
    }, { unique: true });
    await FolderPermissions.dropIndexAsync('folder_1_user_1_googleAccount_1');
  },
});
