import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Hunts from "../../lib/models/Hunts";
import InvitationCodes from "../../lib/models/InvitationCodes";
import MeteorUsers from "../../lib/models/MeteorUsers";
import acceptHuntInvitationCode from "../../methods/acceptHuntInvitationCode";
import addUserToHunt from "../addUserToHunt";
import defineMethod from "./defineMethod";

defineMethod(acceptHuntInvitationCode, {
  validate(arg) {
    check(arg, {
      invitationCode: String,
    });
    return arg;
  },

  async run({ invitationCode }): Promise<string> {
    check(this.userId, String);

    const invitation = await InvitationCodes.findOneAsync({
      code: invitationCode,
    });
    if (!invitation) {
      throw new Meteor.Error(404, "Invalid invitation code");
    }

    const hunt = await Hunts.findOneAsync({
      _id: invitation.hunt,
    });
    if (!hunt) {
      throw new Meteor.Error(404, "Hunt does not exist for invitation");
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    const email = user?.emails?.[0]?.address;
    if (!email) {
      throw new Meteor.Error(500, "No email found for current user");
    }

    await addUserToHunt({ hunt, email, invitedBy: this.userId });

    return hunt._id;
  },
});
