import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import UserStatuses from "../../lib/models/UserStatuses";
import statusesForHuntUsers from "../../lib/publications/statusesForHuntUsers";
import definePublication from "./definePublication";

definePublication(statusesForHuntUsers, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    if (!this.userId) {
      return null;
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    const recencyThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return [
      UserStatuses.find({ hunt: huntId, updatedAt: { $gt: recencyThreshold } }),
    ];
  },
});
