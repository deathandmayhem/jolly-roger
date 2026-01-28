import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureDiscordBot } from "../../lib/permission_stubs";
import Logger from "../../Logger";
import configureDiscordBot from "../../methods/configureDiscordBot";
import defineMethod from "./defineMethod";

defineMethod(configureDiscordBot, {
  validate(arg) {
    check(arg, {
      token: Match.Optional(String),
    });
    return arg;
  },

  async run({ token }) {
    check(this.userId, String);

    if (
      !userMayConfigureDiscordBot(await MeteorUsers.findOneAsync(this.userId))
    ) {
      throw new Meteor.Error(401, "Must be admin to configure Discord Bot");
    }

    if (token) {
      Logger.info("Configuring discord bot token (token redacted)");
      await Settings.upsertAsync(
        { name: "discord.bot" },
        { $set: { "value.token": token } },
      );
    } else {
      Logger.info("Discarding discord bot token");
      await Settings.removeAsync({ name: "discord.bot" });
    }
  },
});
