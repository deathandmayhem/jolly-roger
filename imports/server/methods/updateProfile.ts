import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Logger from "../../Logger";
import updateProfile from "../../methods/updateProfile";
import defineMethod from "./defineMethod";

defineMethod(updateProfile, {
  validate(arg) {
    check(arg, {
      displayName: String,
      phoneNumber: Match.Optional(String),
      dingwords: [String],
    });

    return arg;
  },

  async run({ displayName, phoneNumber, dingwords }) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);

    if (!displayName || displayName.match(/^\s/)) {
      throw new Meteor.Error(
        400,
        "Display name is required and cannot begin with whitespace",
      );
    }

    const unset = { phoneNumber: phoneNumber ? undefined : 1 } as const;

    Logger.info("Updating profile for user", { displayName });
    await MeteorUsers.updateAsync(
      {
        _id: this.userId,
      },
      {
        $set: {
          displayName,
          phoneNumber,
          dingwords,
        },
        $unset: unset,
      },
    );
  },
});
