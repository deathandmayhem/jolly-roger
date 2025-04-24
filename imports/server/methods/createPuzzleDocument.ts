import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import type { GdriveMimeTypesType } from "../../lib/GdriveMimeTypes";
import GdriveMimeTypes from "../../lib/GdriveMimeTypes";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import createPuzzleDocument from "../../methods/createPuzzleDocument";
import { ensureDocument } from "../gdrive";
import GoogleClient from "../googleClientRefresher";
import defineMethod from "./defineMethod";

defineMethod(createPuzzleDocument, {
  validate(arg) {
    check(arg, {
      huntId: String,
      puzzleId: String,
      docType: Match.OneOf(
        ...(Object.keys(GdriveMimeTypes) as GdriveMimeTypesType[]),
      ),
      allowDuplicateUrls: Match.Optional(Boolean),
    });
    return arg;
  },

  async run({ huntId, puzzleId, docType }) {
    check(this.userId, String);

    const hunt = await Hunts.findOneAsync(huntId);
    if (!hunt) {
      throw new Meteor.Error(404, "Unknown hunt id");
    }

    const puzzle = await Puzzles.findOneAsync({ _id: puzzleId, hunt: huntId })!;

    if (
      puzzle &&
      GoogleClient.ready() &&
      !(await Flags.activeAsync("disable.google"))
    ) {
      await ensureDocument(puzzle, docType, true);
    }
  },
});
