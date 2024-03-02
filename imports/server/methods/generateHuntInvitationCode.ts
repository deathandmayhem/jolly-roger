import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayUpdateHuntInvitationCode } from "../../lib/permission_stubs";
import generateHuntInvitationCode from "../../methods/generateHuntInvitationCode";
import defineMethod from "./defineMethod";

// Generate (or regenerate) an invitation code for the given hunt.
defineMethod(generateHuntInvitationCode, {
  validate(arg) {
    check(arg, {
      huntId: String,
    });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);

    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, "Unknown hunt");
    }

    const user = await MeteorUsers.findOneAsync(this.userId);

    if (!userMayUpdateHuntInvitationCode(user, hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not generate invitation codes for ${huntId}`,
      );
    }

    const newInvitationCode = Random.id();

    await Hunts.updateAsync(
      { _id: huntId },
      {
        $set: {
          invitationCode: newInvitationCode,
        },
      },
    );

    return newInvitationCode;
  },
});
