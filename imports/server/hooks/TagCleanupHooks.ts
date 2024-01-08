import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import { computeSolvedness } from "../../lib/solvedness";
import type Hookset from "./Hookset";

const TagCleanupHooks: Hookset = {
  async onPuzzleSolved(puzzleId: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) return;

    // If a puzzle is now fully solved, remove any `needs:*` tags from it.
    const solvedness = computeSolvedness(puzzle);
    if (solvedness !== "solved") {
      return;
    }

    const tags = await Tags.find({ _id: { $in: puzzle.tags } }).fetchAsync();

    const needsTags = tags.filter((tag) => tag.name.startsWith("needs:"));
    if (needsTags.length === 0) {
      return;
    }

    const needsTagsIds = needsTags.map((tag) => tag._id);
    await Puzzles.updateAsync(
      {
        _id: puzzleId,
      },
      {
        $pullAll: {
          tags: needsTagsIds,
        },
      },
    );
  },
};

export default TagCleanupHooks;
