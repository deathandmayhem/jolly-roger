import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import {
  addUserToRole,
  userMayMakeOperatorForHunt,
} from "../../lib/permission_stubs";
import Logger from "../../Logger";
import promoteOperator from "../../methods/promoteOperator";
import defineMethod from "./defineMethod";

defineMethod(promoteOperator, {
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
        "Must be operator or inactive operator to make operator",
      );
    }

    const targetUser = await MeteorUsers.findOneAsync(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, "User not found");
    }

    if (this.userId !== targetUserId) {
      Logger.info("Promoting user to operator", {
        user: targetUserId,
        promoter: this.userId,
      });
    }

    await addUserToRole(targetUserId, huntId, "operator");
  },
});
