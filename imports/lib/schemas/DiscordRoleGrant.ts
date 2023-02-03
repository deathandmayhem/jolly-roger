import { z } from 'zod';
import { foreignKey, snowflake } from './customTypes';
import withCommon from './withCommon';

const DiscordRoleGrant = withCommon(z.object({
  guild: snowflake,
  role: snowflake,
  user: foreignKey,
  discordAccountId: snowflake,
}));

export default DiscordRoleGrant;
