import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import Announcements from "../../lib/models/Announcements";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import PendingAnnouncements from "../../lib/models/PendingAnnouncements";
import { userMayAddAnnouncementToHunt } from "../../lib/permission_stubs";
import postAnnouncement from "../../methods/postAnnouncement";
import GlobalHooks from "../GlobalHooks";
import defineMethod from "./defineMethod";

defineMethod(postAnnouncement, {
  validate(arg) {
    check(arg, {
      huntId: String,
      message: String,
    });

    return arg;
  },

  async run({ huntId, message }) {
    check(this.userId, String);

    if (
      !userMayAddAnnouncementToHunt(
        await MeteorUsers.findOneAsync(this.userId),
        await Hunts.findOneAsync(huntId),
      )
    ) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not create announcements for hunt ${huntId}`,
      );
    }

    Logger.info("Creating an announcement", { hunt: huntId, message });
    const id = await Announcements.insertAsync({
      hunt: huntId,
      message,
    });

    for await (const user of MeteorUsers.find({ hunts: huntId })) {
      await PendingAnnouncements.insertAsync({
        hunt: huntId,
        announcement: id,
        user: user._id,
      });
    }

    await GlobalHooks.runAnnouncementHooks(id);
  },
});
