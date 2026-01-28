import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureServerLanguage } from "../../lib/permission_stubs";
import configureServerLanguage from "../../methods/configureServerLanguage";
import defineMethod from "./defineMethod";

defineMethod(configureServerLanguage, {
  validate(arg) {
    check(arg, {
      language: String,
    });
    return arg;
  },

  async run({ language }) {
    check(this.userId, String);
    if (
      !userMayConfigureServerLanguage(
        await MeteorUsers.findOneAsync(this.userId),
      )
    ) {
      throw new Meteor.Error(401, "Must be admin to configure server language");
    }

    await Settings.upsertAsync(
      { name: "language" },
      {
        $set: {
          value: {
            language,
          },
        },
      },
    );
  },
});
