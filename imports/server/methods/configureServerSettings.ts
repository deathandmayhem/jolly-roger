import { Match, check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import isAdmin from "../../lib/isAdmin";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import configureServerSettings from "../../methods/configureServerSettings";
import defineMethod from "./defineMethod";

defineMethod(configureServerSettings, {
  validate(arg) {
    check(arg, {
      defaultHuntTags: Match.Optional(String),
    });
    return arg;
  },

  async run({ defaultHuntTags }) {
    check(this.userId, String);

    if (!isAdmin(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin");
    }

    await Settings.upsertAsync(
      { name: "server.settings" },
      {
        $set: {
          "value.defaultHuntTags": defaultHuntTags,
        },
      },
    );
  },
});
