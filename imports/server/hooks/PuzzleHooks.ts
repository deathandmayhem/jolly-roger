import Flags from "../../Flags";
import MeteorUsers from "../../lib/models/MeteorUsers";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import Puzzles from "../../lib/models/Puzzles";
import type Hookset from "./Hookset";

const PuzzleHooks: Hookset = {
  async onPuzzleCreated(puzzleId: string) {
    const puzzle = (await Puzzles.findOneAsync({ _id: puzzleId }))!;
    const allUsers: string[] = [];

    // Respect feature flag.
    if (!(await Flags.activeAsync("disable.dingwords"))) {
      for await (const u of MeteorUsers.find({
        hunts: puzzle?.hunt,
      })) {
        allUsers.push(u._id);
      }
    }

    // notify all users
    await Promise.all(
      allUsers.map(async (userId: string) => {
        await PuzzleNotifications.insertAsync({
          user: userId,
          puzzle: puzzleId,
          hunt: puzzle.hunt,
          content: `New puzzle added! `,
          ephemeral: true,
          className: `text-bg-white`,
          createdBy: puzzle.createdBy,
        });
      }),
    );
  },
};

export default PuzzleHooks;
