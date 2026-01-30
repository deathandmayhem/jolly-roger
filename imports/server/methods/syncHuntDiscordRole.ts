import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayUseDiscordBotAPIs } from "../../lib/permission_stubs";
import syncHuntDiscordRole from "../../methods/syncHuntDiscordRole";
import addUsersToDiscordRole from "../addUsersToDiscordRole";
import defineMethod from "./defineMethod";

defineMethod(syncHuntDiscordRole, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);

    if (
      !userMayUseDiscordBotAPIs(await MeteorUsers.findOneAsync(this.userId))
    ) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} not permitted to access Discord bot APIs`,
      );
    }

    const userIds = (
      await MeteorUsers.find({ hunts: huntId }).fetchAsync()
    ).map((u) => u._id);
    await addUsersToDiscordRole(userIds, huntId, { force: false });
  },
});
