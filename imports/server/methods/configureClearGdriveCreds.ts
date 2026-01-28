import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureGdrive } from "../../lib/permission_stubs";
import Logger from "../../Logger";
import configureClearGdriveCreds from "../../methods/configureClearGdriveCreds";
import defineMethod from "./defineMethod";

defineMethod(configureClearGdriveCreds, {
  async run() {
    check(this.userId, String);
    if (!userMayConfigureGdrive(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure gdrive");
    }
    Logger.info("Clearing Gdrive creds", {
      user: this.userId,
    });
    await Settings.removeAsync({ name: "gdrive.credential" });
  },
});
