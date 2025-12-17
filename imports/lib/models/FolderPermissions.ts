import { z } from "zod";
import { foreignKey, nonEmptyString } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

const FolderPermission = withCommon(
  z.object({
    folder: nonEmptyString,
    user: foreignKey,
    // This can change, so capture which one we gave permissions to
    googleAccount: z.string().email(),
    // This is largely a legacy field, as we expect all new grants to use the
    // "commenter" permission (which results in correct attribution of Drive
    // activity), but we originally granted the "reader" permission instead
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
