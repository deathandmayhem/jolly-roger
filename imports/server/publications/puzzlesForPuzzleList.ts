import { check, Match } from "meteor/check";

import Bookmarks from "../../lib/models/Bookmarks";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import puzzlesForPuzzleList from "../../lib/publications/puzzlesForPuzzleList";
import definePublication from "./definePublication";

definePublication(puzzlesForPuzzleList, {
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

    return [
      Puzzles[includeDeleted ? "findAllowingDeleted" : "find"]({
        hunt: huntId,
      }),
      Tags.find({ hunt: huntId }),
      Bookmarks.find({ hunt: huntId, user: this.userId }),
    ];
  },
});
