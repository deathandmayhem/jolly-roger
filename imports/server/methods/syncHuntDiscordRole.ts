import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import type Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { makeForeignKeyMatcher } from '../../lib/models/Model';
import { userMayUseDiscordBotAPIs } from '../../lib/permission_stubs';
import syncHuntDiscordRole from '../../methods/syncHuntDiscordRole';
import addUsersToDiscordRole from '../addUsersToDiscordRole';
import defineMethod from './defineMethod';

defineMethod(syncHuntDiscordRole, {
  validate(arg) {
    check(arg, {
      huntId: makeForeignKeyMatcher<typeof Hunts>(),
    });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);

    if (!userMayUseDiscordBotAPIs(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, `User ${this.userId} not permitted to access Discord bot APIs`);
    }

    const userIds = (await MeteorUsers.find({ hunts: huntId }).fetchAsync()).map((u) => u._id);
    await addUsersToDiscordRole(userIds, huntId, { force: false });
  },
});
