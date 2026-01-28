import DiscordCache from "../../lib/models/DiscordCache";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayConfigureDiscordBot } from "../../lib/permission_stubs";
import discordGuildsAll from "../../lib/publications/discordGuildsAll";
import Logger from "../../Logger";
import definePublication from "./definePublication";

definePublication(discordGuildsAll, {
  async run() {
    if (
      !this.userId ||
      !userMayConfigureDiscordBot(await MeteorUsers.findOneAsync(this.userId))
    ) {
      Logger.info("Sub to discord.guilds not logged in as admin");
      return [];
    }

    return DiscordCache.find({ type: "guild" });
  },
});
