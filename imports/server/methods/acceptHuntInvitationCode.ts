import { check, Match } from "meteor/check";
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
      email: Match.Optional(String),
    });
    return arg;
  },

  async run({ invitationCode, email }): Promise<string> {
    // Note: this method can be called either by a logged-in user without the `email` arg,
    // or by a logged-out user to use the invitation code to send themselves an invite via email.
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

    if (!email) {
      // User is logged in and accepting the invitation for themself.
      check(this.userId, String);
      const user = await MeteorUsers.findOneAsync(this.userId);
      const emailForExistingUser = user?.emails?.[0]?.address;
      if (!emailForExistingUser) {
        throw new Meteor.Error(500, "No email found for current user");
      }

      await addUserToHunt({
        hunt,
        email: emailForExistingUser,
        invitedBy: this.userId,
      });

      return hunt._id;
    } else {
      // If user is specifying an email, they are trying to redeem the invitation code to create a user with that email.
      await addUserToHunt({
        hunt,
        email,
        invitedBy: invitation.createdBy,
      });
      return hunt._id;
    }
  },
});
