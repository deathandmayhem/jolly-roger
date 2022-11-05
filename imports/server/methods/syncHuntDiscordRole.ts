import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { userMayUseDiscordBotAPIs } from '../../lib/permission_stubs';
import syncHuntDiscordRole from '../../methods/syncHuntDiscordRole';
import addUsersToDiscordRole from '../addUsersToDiscordRole';

syncHuntDiscordRole.define({
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);

    if (!userMayUseDiscordBotAPIs(this.userId)) {
      throw new Meteor.Error(401, `User ${this.userId} not permitted to access Discord bot APIs`);
    }

    const userIds = MeteorUsers.find({ hunts: huntId }).fetch().map((u) => u._id);
    await addUsersToDiscordRole(userIds, huntId);
  },
});
