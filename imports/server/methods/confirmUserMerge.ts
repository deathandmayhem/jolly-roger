import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import isAdmin from "../../lib/isAdmin";
import mergeUsers from "../../lib/jobs/mergeUsers";
import MeteorUsers from "../../lib/models/MeteorUsers";
import confirmUserMerge from "../../methods/confirmUserMerge";
import enqueueJob from "../jobs/framework/enqueueJob";
import defineMethod from "./defineMethod";

defineMethod(confirmUserMerge, {
  validate(arg) {
    check(arg, {
      sourceUser: String,
      targetUser: String,
    });
    return arg;
  },

  async run({ sourceUser, targetUser }) {
    check(this.userId, String);

    if (sourceUser === targetUser) {
      throw new Meteor.Error(400, "Cannot merge a user with themselves");
    }

    const caller = await MeteorUsers.findOneAsync(this.userId);
    if (!caller) {
      throw new Meteor.Error(401, "Not logged in");
    }

    if (!isAdmin(caller)) {
      throw new Meteor.Error(401, "Not authorized to merge users");
    }

    Logger.info("Enqueuing user merge", {
      sourceUser,
      targetUser,
      initiatedBy: this.userId,
    });

    return enqueueJob(mergeUsers, { sourceUser, targetUser });
  },
});
