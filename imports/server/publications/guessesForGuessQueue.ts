import { check } from "meteor/check";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import guessesForGuessQueue from "../../lib/publications/guessesForGuessQueue";
import publishJoinedQuery from "../publishJoinedQuery";
import definePublication from "./definePublication";

definePublication(guessesForGuessQueue, {
  validate(arg) {
    check(arg, {
      huntId: String,
    });
    return arg;
  },

  async run({ huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    await publishJoinedQuery(
      this,
      {
        model: Guesses,
        foreignKeys: [
          {
            field: "puzzle",
            join: {
              model: Puzzles,
            },
          },
          {
            field: "hunt",
            join: {
              model: Hunts,
            },
          },
          {
            field: "createdBy",
            join: {
              model: MeteorUsers,
              projection: { displayName: 1 },
            },
          },
        ],
      },
      { hunt: huntId },
    );

    this.ready();
    return undefined;
  },
});
