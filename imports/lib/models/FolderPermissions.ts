import { z } from 'zod';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

const FolderPermission = withCommon(z.object({
  folder: nonEmptyString,
  user: foreignKey,
  // This can change, so capture which one we gave permissions to
  googleAccount: z.string().email(),
  permissionLevel: z.enum(['reader', 'commenter']).optional(),
}));

const FolderPermissions = new SoftDeletedModel('jr_folder_perms', FolderPermission);
export type FolderPermissionType = ModelType<typeof FolderPermissions>;

export default FolderPermissions;
