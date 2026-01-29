import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import {
  removeUserFromRole,
  userMayMakeOperatorForHunt,
} from "../../lib/permission_stubs";
import Logger from "../../Logger";
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

    if (
      !userMayMakeOperatorForHunt(
        await MeteorUsers.findOneAsync(this.userId),
        await Hunts.findOneAsync(huntId),
      )
    ) {
      throw new Meteor.Error(
        401,
        "Must be operator or inactive operator to demote operator",
      );
    }

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
