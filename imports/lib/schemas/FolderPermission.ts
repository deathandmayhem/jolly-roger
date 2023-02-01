import { z } from 'zod';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

const FolderPermission = withCommon(z.object({
  folder: nonEmptyString,
  user: foreignKey,
  // This can change, so capture which one we gave permissions to
  googleAccount: z.string().email(),
  permissionLevel: z.enum(['reader', 'commenter']).optional(),
}));

export default FolderPermission;
