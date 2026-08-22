import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import {
  checkUserHasPermissionForAction,
  removeUserFromRole,
} from "../../lib/permission_stubs";
import demoteOperator from "../../methods/demoteOperator";
import defineMethod from "./defineMethod";

defineMethod(demoteOperator, {
  validate(arg) {
    check(arg, {
      targetUserId: String,
      huntId: String,
    });
    return arg;
  },

  async run({ targetUserId, huntId }) {
    check(this.userId, String);

    checkUserHasPermissionForAction(
      await MeteorUsers.findOneAsync(this.userId),
      await Hunts.findOneAsync(huntId),
      "manageOperators",
    );

    const targetUser = await MeteorUsers.findOneAsync(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, "User not found");
    }

    if (this.userId === targetUserId) {
      throw new Meteor.Error(400, "Cannot demote yourself");
    }

    Logger.info("Demoting user from operator", {
      user: targetUserId,
      demoter: this.userId,
    });
    await removeUserFromRole(targetUserId, huntId, "operator");
  },
});
