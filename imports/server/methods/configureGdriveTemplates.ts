import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureGdrive } from "../../lib/permission_stubs";
import configureGdriveTemplates from "../../methods/configureGdriveTemplates";
import defineMethod from "./defineMethod";

defineMethod(configureGdriveTemplates, {
  validate(arg) {
    check(arg, {
      spreadsheetTemplate: Match.Optional(String),
      documentTemplate: Match.Optional(String),
    });
    return arg;
  },

  async run({ spreadsheetTemplate, documentTemplate }) {
    check(this.userId, String);

    // Only let the same people that can credential gdrive configure templates,
    // which today is just admins
    if (!userMayConfigureGdrive(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure gdrive");
    }

    // In an ideal world, maybe we'd verify that the document IDs we were given
    // are actually like valid documents that we can reach or something.
    if (spreadsheetTemplate) {
      await Settings.upsertAsync(
        { name: "gdrive.template.spreadsheet" },
        { $set: { value: { id: spreadsheetTemplate } } },
      );
    } else {
      await Settings.removeAsync({ name: "gdrive.template.spreadsheet" });
    }

    if (documentTemplate) {
      await Settings.upsertAsync(
        { name: "gdrive.template.document" },
        { $set: { value: { id: documentTemplate } } },
      );
    } else {
      await Settings.removeAsync({ name: "gdrive.template.document" });
    }
  },
});
