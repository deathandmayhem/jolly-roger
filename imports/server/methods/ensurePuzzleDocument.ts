import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import ensurePuzzleDocument from "../../methods/ensurePuzzleDocument";
import { ensureDocument, ensureHuntFolderPermission } from "../gdrive";
import defineMethod from "./defineMethod";

defineMethod(ensurePuzzleDocument, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
    });
    return arg;
  },

  async run({ puzzleId }) {
    check(this.userId, String);

    const user = (await MeteorUsers.findOneAsync(this.userId))!;
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle || !user.hunts?.includes(puzzle.hunt)) {
      throw new Meteor.Error(404, "Unknown puzzle");
    }

    this.unblock();

    await ensureDocument(this.userId, puzzle);

    if (await Flags.activeAsync("disable.google")) {
      return;
    }

    if (await Flags.activeAsync("disable.gdrive_permissions")) {
      return;
    }

    if (user.googleAccount) {
      await ensureHuntFolderPermission(
        puzzle.hunt,
        this.userId,
        user.googleAccount,
      );
    }
  },
});
