import { DiscordAccountType } from './schemas/discord_account';

const DiscordOAuthScopes = ['identify', 'guilds.join'];
const API_BASE = 'https://discord.com/api/v8';

function getAvatarCdnUrl(da: DiscordAccountType): string | undefined {
  if (da.avatar) {
    return `https://cdn.discordapp.com/avatars/${da.id}/${da.avatar}.png?size=40`;
  } else {
    return undefined;
  }
}

export { API_BASE, DiscordOAuthScopes, getAvatarCdnUrl };
