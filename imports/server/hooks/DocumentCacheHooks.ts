import { Meteor } from "meteor/meteor";
import Puzzles from "../../lib/models/Puzzles";
import { checkAndReplenishDocumentCache } from "../methods/replenishDocumentCache";
import type Hookset from "./Hookset";

const DocumentCacheHooks: Hookset = {
  name: "DocumentCacheHooks",

  async onPuzzleCreated(puzzleId: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (puzzle) {
      // Use Meteor.defer to ensure the hook doesn't block other
      // startup/creation tasks or puzzle announcements.
      Meteor.defer(async () => {
        await checkAndReplenishDocumentCache(puzzle.hunt);
      });
    }
  },

  async onPuzzleSolved(puzzleId: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (puzzle) {
      // Use Meteor.defer to ensure the hook doesn't block other
      // startup/creation tasks or puzzle announcements.
      Meteor.defer(async () => {
        await checkAndReplenishDocumentCache(puzzle.hunt);
      });
    }
  },
};

export default DocumentCacheHooks;
