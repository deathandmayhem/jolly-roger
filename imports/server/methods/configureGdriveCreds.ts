import { check } from "meteor/check";
import { Google } from "meteor/google-oauth";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureGdrive } from "../../lib/permission_stubs";
import configureGdriveCreds from "../../methods/configureGdriveCreds";
import defineMethod from "./defineMethod";

defineMethod(configureGdriveCreds, {
  validate(arg) {
    check(arg, {
      key: String,
      secret: String,
    });
    return arg;
  },

  async run({ key, secret }) {
    check(this.userId, String);

    if (!userMayConfigureGdrive(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure gdrive");
    }

    const credential = await Google.retrieveCredential(key, secret);
    const { refreshToken, email, id } = credential.serviceData;
    Logger.info("Updating Gdrive creds", { email });
    await Settings.upsertAsync(
      { name: "gdrive.credential" },
      { $set: { value: { refreshToken, email, id } } },
    );
  },
});
