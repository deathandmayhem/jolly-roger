import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import removePuzzleAnswer from "../../methods/removePuzzleAnswer";
import transitionGuess from "../transitionGuess";
import defineMethod from "./defineMethod";

defineMethod(removePuzzleAnswer, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      guessId: String,
    });
    return arg;
  },

  async run({ puzzleId, guessId }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneAsync(
      {
        _id: puzzleId,
      },
      {
        projection: {
          hunt: 1,
        },
      },
    );

    if (!puzzle) {
      throw new Meteor.Error(404, `Puzzle ${puzzleId} not found`);
    }

    const huntId = puzzle.hunt;
    const hunt = await Hunts.findOneAsync({ _id: huntId });
    if (!hunt || hunt.hasGuessQueue) {
      throw new Meteor.Error(
        400,
        `Hunt ${huntId} does not support self-service answers`,
      );
    }

    const guess = await Guesses.findOneAsync({
      puzzle: puzzleId,
      _id: guessId,
    });
    if (!guess) return;
    await transitionGuess(guess, "incorrect");
  },
});
