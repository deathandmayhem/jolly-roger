import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Tags from "../../lib/models/Tags";
import tagsForHunt from "../../lib/publications/tagsForHunt";
import definePublication from "./definePublication";

definePublication(tagsForHunt, {
  validate(arg) {
    check(arg, {
      huntId: String,
    });
    return arg;
  },

  async run({ huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    return Tags.findAllowingDeleted({
      hunt: huntId,
    });
  },
});
