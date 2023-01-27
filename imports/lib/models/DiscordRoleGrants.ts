import type { DiscordRoleGrantType } from '../schemas/DiscordRoleGrant';
import Base from './Base';

const DiscordRoleGrants = new Base<DiscordRoleGrantType>('discord_role_grants');

export default DiscordRoleGrants;
