import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { userMayBulkAddToHunt } from '../../lib/permission_stubs';
import addHuntUser from '../../methods/addHuntUser';
import bulkAddHuntUsers from '../../methods/bulkAddHuntUsers';

bulkAddHuntUsers.define({
  validate(arg) {
    check(arg, {
      huntId: String,
      emails: [String],
    });
    return arg;
  },

  async run({ huntId, emails }) {
    check(this.userId, String);

    // We'll re-do this check but if we check it now the error reporting will be
    // better
    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, 'Unknown hunt');
    }

    if (!userMayBulkAddToHunt(await MeteorUsers.findOneAsync(this.userId), hunt)) {
      throw new Meteor.Error(401, `User ${this.userId} may not bulk-invite to hunt ${huntId}`);
    }

    const errors: { email: string, error: any }[] = [];
    await Promise.all(emails.map(async (email) => {
      try {
        await addHuntUser.execute(this, { huntId, email });
      } catch (error) {
        errors.push({ email, error });
      }
    }));

    if (errors.length > 0) {
      const message = errors.map(({ email, error }) => {
        const err = error.sanitizedError ?? error;
        return `${email}: ${err.reason}`;
      })
        .join('\n');
      throw new Meteor.Error(500, `Failed to send invites for some emails:\n${message}`);
    }
  },
});
