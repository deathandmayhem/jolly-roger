import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayAddUsersToHunt } from "../../lib/permission_stubs";
import addHuntUser from "../../methods/addHuntUser";
import addUserToHunt from "../addUserToHunt";
import defineMethod from "./defineMethod";

defineMethod(addHuntUser, {
  validate(arg) {
    check(arg, {
      huntId: String,
      email: String,
    });
    return arg;
  },

  async run({ huntId, email }) {
    check(this.userId, String);

    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, "Unknown hunt");
    }

    if (
      !userMayAddUsersToHunt(await MeteorUsers.findOneAsync(this.userId), hunt)
    ) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not add members to ${huntId}`,
      );
    }

    await addUserToHunt({ hunt, email, invitedBy: this.userId });
  },
});
