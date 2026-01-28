import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Bookmarks from "../../lib/models/Bookmarks";
import Puzzles from "../../lib/models/Puzzles";
import bookmarkPuzzle from "../../methods/bookmarkPuzzle";
import ignoringDuplicateKeyErrors from "../ignoringDuplicateKeyErrors";
import defineMethod from "./defineMethod";

defineMethod(bookmarkPuzzle, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      bookmark: Boolean,
    });
    return arg;
  },

  async run({ puzzleId, bookmark }) {
    check(this.userId, String);

    const user = (await Meteor.users.findOneAsync(this.userId))!;

    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, `No puzzle known with id ${puzzleId}`);
    }

    if (!user.hunts?.includes(puzzle.hunt)) {
      throw new Meteor.Error(
        403,
        `User ${this.userId} is not a member of hunt ${puzzle.hunt}`,
      );
    }

    if (bookmark) {
      await ignoringDuplicateKeyErrors(async () => {
        await Bookmarks.insertAsync({
          hunt: puzzle.hunt,
          user: user._id,
          puzzle: puzzleId,
        });
      });
    } else {
      await Bookmarks.removeAsync({
        hunt: puzzle.hunt,
        user: user._id,
        puzzle: puzzleId,
      });
    }
  },
});
