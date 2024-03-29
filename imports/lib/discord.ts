import type { DiscordAccountType } from "./models/DiscordAccount";

const DiscordOAuthScopes = ["identify", "guilds.join"];
const API_BASE = "https://discord.com/api/v8";

// If size is not a supported resolution, returns the next supported size up (or the max size)
function getAvatarCdnUrl(
  da?: DiscordAccountType,
  size = 128,
): string | undefined {
  if (da?.avatar) {
    const supportedSizes = [
      16, 20, 32, 40, 60, 64, 80, 100, 128, 160, 256, 320, 512,
    ];
    const maxSize = supportedSizes[supportedSizes.length - 1];
    const requestSize = supportedSizes.find((s) => s >= size) ?? maxSize;
    return `https://cdn.discordapp.com/avatars/${da.id}/${da.avatar}.png?size=${requestSize}`;
  } else {
    return undefined;
  }
}

function formatDiscordName(da?: DiscordAccountType): string | undefined {
  if (!da?.username) return undefined;

  if (!da.discriminator || da.discriminator === "0") return da.username;
  return `${da.username}#${da.discriminator}`;
}

export { API_BASE, DiscordOAuthScopes, getAvatarCdnUrl, formatDiscordName };
