import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { z } from "zod";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureGdrive } from "../../lib/permission_stubs";
import configureGdriveCreds from "../../methods/configureGdriveCreds";
import retrieveOAuthCredential from "../retrieveOAuthCredential";
import defineMethod from "./defineMethod";

// Without a refresh token, the credential would stop working once the access
// token expires. The setup page forces a consent prompt so Google issues one.
const GdriveIdentity = z.object({
  id: z.string(),
  email: z.string(),
  refreshToken: z.string(),
});

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

    const credential = await retrieveOAuthCredential(
      "google",
      key,
      secret,
      GdriveIdentity,
    );
    if (!credential) {
      throw new Meteor.Error(
        400,
        "Google credential not found. Please try again.",
      );
    }
    const { refreshToken, email, id } = credential;
    Logger.info("Updating Gdrive creds", { email });
    await Settings.upsertAsync(
      { name: "gdrive.credential" },
      { $set: { value: { refreshToken, email, id } } },
    );
  },
});
