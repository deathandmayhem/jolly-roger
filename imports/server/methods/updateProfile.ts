import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import updateProfile from "../../methods/updateProfile";
import defineMethod from "./defineMethod";

defineMethod(updateProfile, {
  validate(arg) {
    check(arg, {
      displayName: String,
      phoneNumber: Match.Optional(String),
      dingwords: [String],
      enrollmentToken: Match.Optional(String),
    });

    return arg;
  },

  async run({ displayName, phoneNumber, dingwords, enrollmentToken }) {
    let userId: string;
    if (enrollmentToken) {
      // enrollmentToken is only for the unauthenticated enrollment path.
      // A logged-in user must not be able to use a token to target a
      // different user's profile.
      if (this.userId) {
        throw new Meteor.Error(
          400,
          "Cannot use enrollment token while logged in",
        );
      }

      // Look up the user by their enrollment token. This supports calling
      // updateProfile before Accounts.resetPassword consumes the token,
      // making enrollment resilient to method retries on connection drops.
      const user = await MeteorUsers.findOneAsync(
        { "services.password.enroll.token": enrollmentToken },
        { fields: { _id: 1 } },
      );
      if (!user) {
        throw new Meteor.Error(403, "Token expired");
      }
      userId = user._id;
    } else {
      check(this.userId, String);
      userId = this.userId;
    }

    if (!displayName || displayName.match(/^\s/)) {
      throw new Meteor.Error(
        400,
        "Display name is required and cannot begin with whitespace",
      );
    }

    const unset = { phoneNumber: phoneNumber ? undefined : 1 } as const;

    Logger.info("Updating profile for user", { displayName });
    await MeteorUsers.updateAsync(userId, {
      $set: {
        displayName,
        phoneNumber,
        dingwords,
      },
      $unset: unset,
    });
  },
});
