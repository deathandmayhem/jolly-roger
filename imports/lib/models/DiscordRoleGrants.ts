import { DiscordRoleGrantType } from '../schemas/DiscordRoleGrant';
import Base from './Base';

const DiscordRoleGrants = new Base<DiscordRoleGrantType>('discord_role_grants');
DiscordRoleGrants.publish((userId) => {
  return { user: userId };
});

export default DiscordRoleGrants;
