import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import addUserAccountEmail from "../../methods/addUserAccountEmail";
import checkVerificationEmailCooldown from "../checkVerificationEmailCooldown";
import defineMethod from "./defineMethod";

defineMethod(addUserAccountEmail, {
  validate(arg) {
    check(arg, { email: String });
    return arg;
  },

  async run({ email }) {
    check(this.userId, String);

    await checkVerificationEmailCooldown(this.userId);

    // There's a TOCTOU failure here if the email gets added to another account
    // between this check and the Accounts.addEmailAsync call, but that just
    // means we'll show a less-good error message.
    const existingUser = await MeteorUsers.findOneAsync(
      { "emails.address": email },
      { fields: { _id: 1 } },
    );
    if (existingUser && existingUser._id !== this.userId) {
      throw new Meteor.Error(
        409,
        "That email address is already associated with another account. If you'd like to merge the accounts, contact an admin.",
      );
    }

    Logger.info("Adding email to user account", {
      user: this.userId,
      email,
    });
    await Accounts.addEmailAsync(this.userId, email);
    await Accounts.sendVerificationEmail(this.userId, email);
  },
});
