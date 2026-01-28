import { check, Match } from "meteor/check";

import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import puzzlesForHunt from "../../lib/publications/puzzlesForHunt";
import definePublication from "./definePublication";

definePublication(puzzlesForHunt, {
  validate(arg) {
    check(arg, {
      huntId: String,
      includeDeleted: Match.Optional(Boolean),
    });
    return arg;
  },

  async run({ huntId, includeDeleted = false }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    return Puzzles[includeDeleted ? "findAllowingDeleted" : "find"]({
      hunt: huntId,
    });
  },
});
