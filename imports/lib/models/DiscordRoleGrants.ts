import DiscordRoleGrant from '../schemas/DiscordRoleGrant';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const DiscordRoleGrants = new SoftDeletedModel('jr_discord_role_grants', DiscordRoleGrant);
export type DiscordRoleGrantType = ModelType<typeof DiscordRoleGrants>;

export default DiscordRoleGrants;
