import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { addUserToRole, checkAdmin } from '../../lib/permission_stubs';
import { HuntPattern } from '../../lib/schemas/Hunt';
import createHunt from '../../methods/createHunt';
import addUsersToDiscordRole from '../addUsersToDiscordRole';
import { ensureHuntFolder } from '../gdrive';

createHunt.define({
  validate(arg) {
    check(arg, HuntPattern);
    return arg;
  },

  run(arg) {
    check(this.userId, String);
    checkAdmin(this.userId);

    const huntId = Hunts.insert(arg);
    addUserToRole(this.userId, huntId, 'operator');

    Meteor.defer(async () => {
      // Sync discord roles
      const userIds = MeteorUsers.find({ hunts: huntId }).fetch().map((u) => u._id);
      await addUsersToDiscordRole(userIds, huntId);
      await ensureHuntFolder({ _id: huntId, name: arg.name });
    });

    return huntId;
  },
});
