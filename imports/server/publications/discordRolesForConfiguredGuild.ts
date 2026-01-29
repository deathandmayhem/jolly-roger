import DiscordCache from "../../lib/models/DiscordCache";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayUseDiscordBotAPIs } from "../../lib/permission_stubs";
import discordRolesForConfiguredGuild from "../../lib/publications/discordRolesForConfiguredGuild";
import Logger from "../../Logger";
import definePublication from "./definePublication";

definePublication(discordRolesForConfiguredGuild, {
  async run() {
    if (
      !this.userId ||
      !userMayUseDiscordBotAPIs(await MeteorUsers.findOneAsync(this.userId))
    ) {
      Logger.info("Sub to discord.cache not logged in as operator");
      return [];
    }

    const guildSetting = await Settings.findOneAsync({ name: "discord.guild" });
    if (!guildSetting) {
      Logger.info("No discord guild configured; will not expose the cache");
      return [];
    }

    const guildId = guildSetting.value?.guild?.id;
    if (!guildId) {
      Logger.info("No discord guild configured; will not expose the cache");
      return [];
    }

    return DiscordCache.find({ type: "role", "object.guild": guildId });
  },
});
