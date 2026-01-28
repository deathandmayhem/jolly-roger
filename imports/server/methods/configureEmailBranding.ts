import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureEmailBranding } from "../../lib/permission_stubs";
import configureEmailBranding from "../../methods/configureEmailBranding";
import defineMethod from "./defineMethod";

defineMethod(configureEmailBranding, {
  validate(arg) {
    check(arg, {
      from: Match.Optional(String),
      enrollSubject: Match.Optional(String),
      enrollMessage: Match.Optional(String),
      joinSubject: Match.Optional(String),
      joinMessage: Match.Optional(String),
    });
    return arg;
  },

  async run({ from, enrollSubject, enrollMessage, joinSubject, joinMessage }) {
    check(this.userId, String);
    if (
      !userMayConfigureEmailBranding(
        await MeteorUsers.findOneAsync(this.userId),
      )
    ) {
      throw new Meteor.Error(401, "Must be admin to configure email branding");
    }

    const value = {
      from,
      enrollAccountMessageSubjectTemplate: enrollSubject,
      enrollAccountMessageTemplate: enrollMessage,
      existingJoinMessageSubjectTemplate: joinSubject,
      existingJoinMessageTemplate: joinMessage,
    };

    await Settings.upsertAsync(
      { name: "email.branding" },
      {
        $set: {
          name: "email.branding",
          value,
        },
      },
    );
  },
});
