import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Tags from "../../lib/models/Tags";
import tagsForUser from "../../lib/publications/tagsForUser";
import definePublication from "./definePublication";

definePublication(tagsForUser, {
  validate(arg) {
    check(arg, {
      userId: String,
    });
    return arg;
  },

  async run({ userId }) {
    if (!this.userId || this.userId !== userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);

    return Tags.findAllowingDeleted({
      hunt: { $in: user.hunts },
    });
  },
});
