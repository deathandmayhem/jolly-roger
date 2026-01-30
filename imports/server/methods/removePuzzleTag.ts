import { check } from "meteor/check";

import Puzzles from "../../lib/models/Puzzles";
import Logger from "../../Logger";
import removePuzzleTag from "../../methods/removePuzzleTag";
import defineMethod from "./defineMethod";

defineMethod(removePuzzleTag, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      tagId: String,
    });

    return arg;
  },

  async run({ puzzleId, tagId }) {
    check(this.userId, String);

    Logger.info("Untagging puzzle", { puzzle: puzzleId, tag: tagId });
    await Puzzles.updateAsync(
      {
        _id: puzzleId,
      },
      {
        $pull: {
          tags: tagId,
        },
      },
    );
  },
});
