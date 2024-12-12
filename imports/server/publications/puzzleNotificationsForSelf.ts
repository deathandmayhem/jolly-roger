import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import puzzleNotificationsForSelf from "../../lib/publications/puzzleNotificationsForSelf";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

definePublication(puzzleNotificationsForSelf, {
  run() {
    if (!this.userId) {
      return [];
    }

    publishJoinedQuery(
      this,
      {
        model: PuzzleNotifications,
        foreignKeys: [
          {
            field: "puzzle",
            join: { model: Puzzles },
          },
          {
            field: "hunt",
            join: { model: Hunts },
          },
        ],
      },
      { user: this.userId },
    );
    this.ready();

    return undefined;
  },
});
