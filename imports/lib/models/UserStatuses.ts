import { z } from "zod";
import type { ModelType } from "../../lib/models/Model";
import Model from "../../lib/models/Model";
import { foreignKey, nonEmptyString } from "../../lib/models/customTypes";
import { Id } from "../../lib/models/regexes";
import withTimestamps from "../../lib/models/withTimestamps";

export const UserStatus = withTimestamps(
  z.object({
    server: foreignKey.optional(),
    // The connection ID is not technically a foreign key because it doesn't refer
    // to another database record
    connection: z.string().regex(Id).optional(),
    user: foreignKey,
    type: nonEmptyString,
    status: nonEmptyString,
    hunt: foreignKey,
    puzzle: foreignKey.optional(),
  }),
);

const UserStatuses = new Model("jr_userstatuses", UserStatus);
UserStatuses.addIndex({ server: 1 });
UserStatuses.addIndex({ hunt: 1 });
UserStatuses.addIndex({ user: 1 });
UserStatuses.addIndex({ type: 1 });
UserStatuses.addIndex({ status: 1 });
export type UserStatusType = ModelType<typeof UserStatuses>;

export default UserStatuses;
