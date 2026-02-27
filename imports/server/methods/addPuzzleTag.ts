import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { userIsInHunt } from "../../lib/permission_stubs";
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
    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user) {
      throw new Meteor.Error(500, `Logged-in user ${this.userId} not found`);
    }

    // Look up which hunt the specified puzzle is from.
    const puzzle = await Puzzles.findOneAsync(
      {
        _id: puzzleId,
      },
      {
        projection: {
          hunt: 1,
        },
      },
    );
    if (!puzzle) {
      throw new Meteor.Error(404, `No puzzle known with id ${puzzleId}`);
    }

    const huntId = puzzle.hunt;
    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, `No hunt ${huntId} found`);
    }

    if (!userIsInHunt(user, hunt._id)) {
      throw new Meteor.Error(
        403,
        `You are not a member of the hunt ${huntId} and thus cannot add tags to puzzles in that hunt`,
      );
    }

    const tagId = await getOrCreateTagByName(huntId, tagName);

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
