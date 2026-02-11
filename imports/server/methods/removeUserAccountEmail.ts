import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { primaryEmail } from "../../lib/models/User";
import removeUserAccountEmail from "../../methods/removeUserAccountEmail";
import defineMethod from "./defineMethod";

defineMethod(removeUserAccountEmail, {
  validate(arg) {
    check(arg, { email: String });
    return arg;
  },

  async run({ email }) {
    check(this.userId, String);

    Logger.info("Removing email from user account", {
      user: this.userId,
      email,
    });

    // Use an atomic update to avoid races between parallel callers.
    // The query enforces all preconditions:
    //   - the email belongs to this user
    //   - it is not the primary email (index 0)
    //   - there are at least 2 emails
    const result = await MeteorUsers.updateAsync(
      {
        _id: this.userId,
        "emails.address": email,
        "emails.0.address": { $ne: email },
        "emails.1": { $exists: true },
      },
      { $pull: { emails: { address: email } } },
    );

    if (result === 0) {
      // Re-read to provide a specific error message
      const user = await MeteorUsers.findOneAsync(this.userId);
      if (!user?.emails?.some((e) => e.address === email)) {
        throw new Meteor.Error(400, "Email not found on this account");
      }
      if (primaryEmail(user) === email) {
        throw new Meteor.Error(400, "Cannot remove primary email");
      }
      throw new Meteor.Error(400, "Cannot remove last email");
    }
  },
});
