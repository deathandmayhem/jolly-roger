import Flags from "../../Flags";
import MeteorUsers from "../../lib/models/MeteorUsers";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import Puzzles from "../../lib/models/Puzzles";
import type Hookset from "./Hookset";

const PuzzleHooks: Hookset = {
  async onPuzzleCreated(puzzleId: string) {
    const puzzle = (await Puzzles.findOneAsync({ _id: puzzleId }))!;

    for await (const u of MeteorUsers.find({
      hunts: puzzle?.hunt,
    })) {
      await PuzzleNotifications.insertAsync({
        user: u._id,
        puzzle: puzzleId,
        hunt: puzzle.hunt,
        content: `New puzzle added! `,
        ephemeral: true,
        background: "info",
        createdBy: puzzle.createdBy,
      });
    }

  },
};

export default PuzzleHooks;
