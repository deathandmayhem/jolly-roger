import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayBulkAddToHunt } from "../../lib/permission_stubs";
import bulkAddHuntUsers from "../../methods/bulkAddHuntUsers";
import addUserToHunt from "../addUserToHunt";
import defineMethod from "./defineMethod";

defineMethod(bulkAddHuntUsers, {
  validate(arg) {
    check(arg, {
      huntId: String,
      emails: [String],
    });
    return arg;
  },

  async run({ huntId, emails }) {
    const { userId } = this;
    check(userId, String);

    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, "Unknown hunt");
    }

    if (!userMayBulkAddToHunt(await MeteorUsers.findOneAsync(userId), hunt)) {
      throw new Meteor.Error(
        401,
        `User ${userId} may not bulk-invite to hunt ${huntId}`,
      );
    }

    const errors: { email: string; error: any }[] = [];
    for (const email of emails) {
      try {
        await addUserToHunt({ hunt, email, invitedBy: userId });
      } catch (error) {
        errors.push({ email, error });
      }
    }

    if (errors.length > 0) {
      const message = errors
        .map(({ email, error }) => {
          const err = error.sanitizedError ?? error;
          return `${email}: ${err}`;
        })
        .join("\n");
      throw new Meteor.Error(
        500,
        `Failed to send invites for some emails:\n${message}`,
      );
    }
  },
});
