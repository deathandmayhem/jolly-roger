import FolderPermission from '../schemas/FolderPermission';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const FolderPermissions = new SoftDeletedModel('jr_folder_perms', FolderPermission);
export type FolderPermissionType = ModelType<typeof FolderPermissions>;

export default FolderPermissions;
