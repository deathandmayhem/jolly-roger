import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureTeamName } from "../../lib/permission_stubs";
import configureTeamName from "../../methods/configureTeamName";
import defineMethod from "./defineMethod";

defineMethod(configureTeamName, {
  validate(arg) {
    check(arg, {
      teamName: Match.Optional(String),
    });
    return arg;
  },

  async run({ teamName }) {
    check(this.userId, String);
    if (
      !userMayConfigureTeamName(await MeteorUsers.findOneAsync(this.userId))
    ) {
      throw new Meteor.Error(401, "Must be admin to configure team name");
    }

    if (teamName) {
      await Settings.upsertAsync(
        { name: "teamname" },
        {
          $set: {
            value: {
              teamName,
            },
          },
        },
      );
    } else {
      await Settings.removeAsync({ name: "teamname" });
    }
  },
});
