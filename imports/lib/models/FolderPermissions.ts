import type { FolderPermissionType } from '../schemas/FolderPermission';
import Base from './Base';

const FolderPermissions = new Base<FolderPermissionType>('folder_perms');

export default FolderPermissions;
