import FolderPermissionSchema, { FolderPermissionType } from '../schemas/folder_permission';
import Base from './base';

const FolderPermissions = new Base<FolderPermissionType>('folder_perms');
FolderPermissions.attachSchema(FolderPermissionSchema);
FolderPermissions.publish((userId, q) => {
  return { ...q, user: userId };
});

export default FolderPermissions;
