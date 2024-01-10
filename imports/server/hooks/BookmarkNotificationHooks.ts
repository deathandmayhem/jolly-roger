import BookmarkNotifications from "../../lib/models/BookmarkNotifications";
import Bookmarks from "../../lib/models/Bookmarks";
import Puzzles from "../../lib/models/Puzzles";
import { computeSolvedness } from "../../lib/solvedness";
import type Hookset from "./Hookset";

const BookmarkNotificationHooks: Hookset = {
  name: "BookmarkNotificationHooks",

  async onPuzzleSolved(puzzleId, answer) {
    const puzzle = (await Puzzles.findOneAsync(puzzleId))!;
    const solvedness = computeSolvedness(puzzle);
    const bookmarked = await Bookmarks.find({ puzzle: puzzleId }).fetchAsync();

    await Promise.all(
      bookmarked.map(async (bookmark) => {
        await BookmarkNotifications.insertAsync({
          user: bookmark.user,
          puzzle: puzzleId,
          hunt: puzzle.hunt,
          solvedness,
          answer,
        });
      }),
    );
  },
};

export default BookmarkNotificationHooks;
