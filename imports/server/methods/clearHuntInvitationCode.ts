import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Hunts from "../../lib/models/Hunts";
import InvitationCodes from "../../lib/models/InvitationCodes";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayUpdateHuntInvitationCode } from "../../lib/permission_stubs";
import clearHuntInvitationCode from "../../methods/clearHuntInvitationCode";
import withLock from "../withLock";
import defineMethod from "./defineMethod";

// Clear the invitation code for the given hunt.
defineMethod(clearHuntInvitationCode, {
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
        `User ${this.userId} may not clear invitation code for ${huntId}`,
      );
    }

    await withLock(`invitation_code:${huntId}`, async () => {
      for await (const code of InvitationCodes.find({ hunt: huntId })) {
        await InvitationCodes.destroyAsync(code._id);
      }
    });
  },
});
