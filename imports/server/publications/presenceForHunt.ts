import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Subscribers from "../models/Subscribers";
import presenceForHunt from "../../lib/publications/presenceForHunt";
import definePublication from "./definePublication";

definePublication(presenceForHunt, {
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

    return Subscribers.find({
      "context.hunt": huntId,
    });
  },
});
