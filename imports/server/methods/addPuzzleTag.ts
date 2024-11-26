import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import Puzzles from "../../lib/models/Puzzles";
import addPuzzleTag from "../../methods/addPuzzleTag";
import getOrCreateTagByName from "../getOrCreateTagByName";
import defineMethod from "./defineMethod";

defineMethod(addPuzzleTag, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      tagName: String,
    });

    return arg;
  },

  async run({ puzzleId, tagName }) {
    check(this.userId, String);

    // Look up which hunt the specified puzzle is from.
    const puzzle = await Puzzles.findOneAsync(
      {
        _id: puzzleId,
      },
      {
        fields: {
          hunt: 1,
        },
      },
    );
    if (!puzzle) {
      throw new Meteor.Error(404, `No puzzle known with id ${puzzleId}`);
    }

    const huntId = puzzle.hunt;
    const tagId = await getOrCreateTagByName(this.userId, huntId, tagName);

    Logger.info("Tagging puzzle", { puzzle: puzzleId, tag: tagName });
    await Puzzles.updateAsync(
      {
        _id: puzzleId,
      },
      {
        $addToSet: {
          tags: tagId,
        },
      },
    );
  },
});
