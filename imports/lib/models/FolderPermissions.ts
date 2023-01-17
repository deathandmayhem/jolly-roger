import { FolderPermissionType } from '../schemas/FolderPermission';
import Base from './Base';

const FolderPermissions = new Base<FolderPermissionType>('folder_perms');
FolderPermissions.publish((userId) => {
  return { user: userId };
});

export default FolderPermissions;
