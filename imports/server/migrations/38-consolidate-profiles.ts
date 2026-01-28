import type { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Migrations from "./Migrations";

// Since the profiles model has been removed, we need to make our own collection
// for this migration.
const Profiles = new Mongo.Collection<
  { _id: string } & Pick<
    Meteor.User,
    | "displayName"
    | "googleAccount"
    | "discordAccount"
    | "phoneNumber"
    | "dingwords"
  >
>("jr_profiles");

Migrations.add({
  version: 38,
  name: "Consolidate profiles onto MeteorUsers",
  async up() {
    for await (const u of MeteorUsers.find({ profile: { $ne: null as any } })) {
      // Note: If we ever make MeteorUsers a Model instead of a
      // Mongo.Collection, we'll need to bypass the schema here
      await MeteorUsers.updateAsync(u._id, { $unset: { profile: 1 } });
    }

    for await (const profile of Profiles.find({})) {
      const {
        displayName,
        googleAccount,
        discordAccount,
        phoneNumber,
        dingwords,
      } = profile;
      await MeteorUsers.updateAsync(profile._id, {
        $set: {
          profile: {
            displayName,
            googleAccount,
            discordAccount,
            phoneNumber,
            dingwords,
          },
        },
      });
    }

    // Add indexes to match the old profiles model
    await MeteorUsers.createIndexAsync({ "profile.displayName": 1 });
    await MeteorUsers.createIndexAsync({ _id: 1, "profile.displayName": 1 });
    await MeteorUsers.createIndexAsync({ _id: 1, "profile.dingwords": 1 });
  },
});
