import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { foreignKey, nonEmptyString } from "./customTypes";
import withCommon from "./withCommon";

const FolderPermission = withCommon(
  z.object({
    folder: nonEmptyString,
    user: foreignKey,
    // This can change, so capture which one we gave permissions to
    googleAccount: z.email(),
    permissionLevel: z.enum(["reader", "commenter"]).optional(),
  }),
);

const FolderPermissions = new SoftDeletedModel(
  "jr_folder_perms",
  FolderPermission,
);
FolderPermissions.addIndex(
  {
    folder: 1,
    user: 1,
    googleAccount: 1,
    permissionLevel: 1,
  },
  { unique: true },
);
export type FolderPermissionType = ModelType<typeof FolderPermissions>;

export default FolderPermissions;
