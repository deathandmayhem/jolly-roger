import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import Documents from "../../lib/models/Documents";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { userMayDestroyPuzzlesForHunt } from "../../lib/permission_stubs";
import undestroyPuzzle from "../../methods/undestroyPuzzle";
import { makeReadWrite } from "../gdrive";
import defineMethod from "./defineMethod";

defineMethod(undestroyPuzzle, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
    });
    return arg;
  },

  async run({ puzzleId }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneDeletedAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, "Unknown puzzle id");
    }
    if (
      !userMayDestroyPuzzlesForHunt(
        await MeteorUsers.findOneAsync(this.userId),
        await Hunts.findOneAsync(puzzle.hunt),
      )
    ) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`,
      );
    }

    await Puzzles.updateAsync(puzzleId, {
      $set: {
        deleted: false,
      },
      $unset: {
        replacedBy: 1,
      },
    });

    if (await Flags.activeAsync("disable.google")) {
      return;
    }

    if (await Flags.activeAsync("disable.gdrive_permissions")) {
      return;
    }

    const document = await Documents.findOneAsync({ puzzle: puzzleId });

    if (document) {
      await makeReadWrite(document.value.id);
    }
  },
});
