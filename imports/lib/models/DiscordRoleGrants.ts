import { z } from "zod";
import { foreignKey, snowflake } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";

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
