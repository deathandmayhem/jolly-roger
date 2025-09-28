import { check } from "meteor/check";
import { Google } from "meteor/google-oauth";
import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import linkUserGoogleAccount from "../../methods/linkUserGoogleAccount";
import { ensureHuntFolderPermission } from "../gdrive";
import defineMethod from "./defineMethod";

defineMethod(linkUserGoogleAccount, {
  validate(arg) {
    check(arg, {
      key: String,
      secret: String,
    });
    return arg;
  },

  async run({ key, secret }) {
    check(this.userId, String);

    // We don't care about actually capturing the credential - we're
    // not going to do anything with it (and with only identity
    // scopes, I don't think you can do anything with it), but we do
    // want to validate it.
    const credential = await Google.retrieveCredential(key, secret);
    const { email, id, picture } = credential.serviceData;
    Logger.info("Linking user to Google account", {
      email,
      id,
      picture,
    });

    await MeteorUsers.updateAsync(this.userId, {
      $set: {
        googleAccount: email,
        googleAccountId: id,
        googleProfilePicture: picture,
      },
    });

    if (
      !(await Flags.activeAsync("disable.google")) &&
      !(await Flags.activeAsync("disable.gdrive_permissions"))
    ) {
      const hunts = (await Meteor.userAsync())!.hunts;
      for (const huntId of hunts ?? []) {
        await ensureHuntFolderPermission(huntId, this.userId, email);
      }
    }
  },
});
