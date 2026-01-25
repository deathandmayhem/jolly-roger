import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import Documents from "../../lib/models/Documents";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { userMayWritePuzzlesForHunt } from "../../lib/permission_stubs";
import destroyPuzzle from "../../methods/destroyPuzzle";
import { copySheets, makeReadOnly } from "../gdrive";
import defineMethod from "./defineMethod";

defineMethod(destroyPuzzle, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      replacedBy: Match.Optional(String),
      copySheetsToReplacement: Boolean,
    });
    return arg;
  },

  async run({ puzzleId, replacedBy, copySheetsToReplacement }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, "Unknown puzzle id");
    }
    if (
      !userMayWritePuzzlesForHunt(
        await MeteorUsers.findOneAsync(this.userId),
        await Hunts.findOneAsync(puzzle.hunt),
      )
    ) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`,
      );
    }

    const document = await Documents.findOneAsync({ puzzle: puzzleId });

    if (replacedBy) {
      const replacedByPuzzle = await Puzzles.findOneAsync(replacedBy);
      if (!replacedByPuzzle || replacedByPuzzle.hunt !== puzzle.hunt) {
        throw new Meteor.Error(400, "Invalid replacement puzzle");
      }

      if (copySheetsToReplacement) {
        const otherDocument = await Documents.findOneAsync({
          puzzle: replacedBy,
        });

        if (!document) {
          throw new Meteor.Error(
            400,
            "Invalid puzzle document when copy is requested",
          );
        }

        if (!otherDocument) {
          throw new Meteor.Error(
            400,
            "Invalid replacement puzzle document when copy is requested",
          );
        }

        // because the process of copying sheets may be slow, append [DELETING]
        // to the title to indicate the state
        await Puzzles.updateAsync(puzzleId, {
          $set: {
            title: `${puzzle.title} [DELETING]`,
          },
        });
        await copySheets(document._id, otherDocument._id);
      }
    }

    await Puzzles.updateAsync(puzzleId, {
      $set: {
        replacedBy,
        deleted: true,
        title: puzzle.title,
      },
    });

    if (await Flags.activeAsync("disable.google")) {
      return;
    }

    if (await Flags.activeAsync("disable.gdrive_permissions")) {
      return;
    }

    if (document) {
      await makeReadOnly(document.value.id);
    }
  },
});
