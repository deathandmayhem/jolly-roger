import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import makeUserEmailPrimary from "../../methods/makeUserEmailPrimary";
import defineMethod from "./defineMethod";

defineMethod(makeUserEmailPrimary, {
  validate(arg) {
    check(arg, { email: String });
    return arg;
  },

  async run({ email }) {
    check(this.userId, String);

    Logger.info("Making email primary for user account", {
      user: this.userId,
      email,
    });

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.emails) {
      throw new Meteor.Error(400, "No emails on account");
    }

    const entry = user.emails.find((e) => e.address === email);
    if (!entry) {
      throw new Meteor.Error(400, "Email not found on this account");
    }

    if (!entry.verified) {
      throw new Meteor.Error(400, "Cannot make unverified email primary");
    }

    const reordered = [
      entry,
      ...user.emails.filter((e) => e.address !== email),
    ];

    // Match on the current emails array to detect concurrent modifications
    const result = await MeteorUsers.updateAsync(
      { _id: this.userId, emails: user.emails },
      { $set: { emails: reordered } },
    );

    if (result === 0) {
      throw new Meteor.Error(
        409,
        "Emails were modified concurrently, please try again",
      );
    }
  },
});
