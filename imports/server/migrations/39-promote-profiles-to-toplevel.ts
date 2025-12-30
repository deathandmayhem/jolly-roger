import type { Meteor } from "meteor/meteor";
import MeteorUsers from "../../lib/models/MeteorUsers";
import dropIndex from "./dropIndex";
import Migrations from "./Migrations";

type LegacyProfile = Pick<
  Meteor.User,
  | "displayName"
  | "googleAccount"
  | "discordAccount"
  | "phoneNumber"
  | "dingwords"
>;

Migrations.add({
  version: 39,
  name: "Promote profile fields to user top-level",
  async up() {
    for await (const u of MeteorUsers.find({ profile: { $ne: null as any } })) {
      const {
        displayName,
        googleAccount,
        discordAccount,
        phoneNumber,
        dingwords,
      } = u.profile as LegacyProfile;
      await MeteorUsers.updateAsync(u._id, {
        $set: {
          displayName,
          googleAccount,
          discordAccount,
          phoneNumber,
          dingwords,
        },
      });
      await MeteorUsers.updateAsync(u._id, {
        $unset: { profile: 1 },
      });
    }

    // Fix indexes
    await MeteorUsers.createIndexAsync({ displayName: 1 });
    await MeteorUsers.createIndexAsync({ _id: 1, displayName: 1 });
    await MeteorUsers.createIndexAsync({ _id: 1, dingwords: 1 });
    await dropIndex(MeteorUsers, "profile.displayName_1");
    await dropIndex(MeteorUsers, "_id_1_profile.displayName_1");
    await dropIndex(MeteorUsers, "_id_1_profile.dingwords_1");
  },
});
