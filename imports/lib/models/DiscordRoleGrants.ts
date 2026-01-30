import { z } from "zod";
import { foreignKey, snowflake } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

const DiscordRoleGrant = withCommon(
  z.object({
    guild: snowflake,
    role: snowflake,
    user: foreignKey,
    discordAccountId: snowflake,
  }),
);

const DiscordRoleGrants = new SoftDeletedModel(
  "jr_discord_role_grants",
  DiscordRoleGrant,
);
DiscordRoleGrants.addIndex(
  {
    guild: 1,
    role: 1,
    user: 1,
    discordAccountId: 1,
  },
  { unique: true },
);

export type DiscordRoleGrantType = ModelType<typeof DiscordRoleGrants>;

export default DiscordRoleGrants;
