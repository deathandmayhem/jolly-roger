import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import UserStatuses from "../../lib/models/UserStatuses";
import statusesForHuntUsers from "../../lib/publications/statusesForHuntUsers";
import definePublication from "./definePublication";

definePublication(statusesForHuntUsers, {
  validate(arg) {
    check(arg, {
      huntId: String,
    });
    return arg;
  },

  async run({ huntId }) {
    // if (!this.userId) {
    //   return [];
    // }

    // const user = await MeteorUsers.findOneAsync(this.userId);
    // if (!user?.hunts?.includes(huntId)) {
    //   return [];
    // }
    // return UserStatuses.find({});
    return UserStatuses.find({
      hunt: huntId,
    });
  },
});
