import { z } from 'zod';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';
import { foreignKey, snowflake } from './customTypes';
import withCommon from './withCommon';

const DiscordRoleGrant = withCommon(z.object({
  guild: snowflake,
  role: snowflake,
  user: foreignKey,
  discordAccountId: snowflake,
}));

const DiscordRoleGrants = new SoftDeletedModel('jr_discord_role_grants', DiscordRoleGrant);
export type DiscordRoleGrantType = ModelType<typeof DiscordRoleGrants>;

export default DiscordRoleGrants;
