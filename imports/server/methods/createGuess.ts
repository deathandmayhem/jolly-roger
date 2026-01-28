import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import Logger from "../../Logger";
import createGuess from "../../methods/createGuess";
import sendChatMessageInternal from "../sendChatMessageInternal";
import defineMethod from "./defineMethod";

defineMethod(createGuess, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      guess: String,
      direction: Number,
      confidence: Number,
    });
    return arg;
  },

  async run({ puzzleId, guess, direction, confidence }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneAsync(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, "No such puzzle");
    }

    const hunt = await Hunts.findOneAsync(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, "No such hunt");
    }

    if (!hunt.hasGuessQueue) {
      throw new Meteor.Error(
        404,
        "Hunt does not allow you to submit guesses, only answers",
      );
    }

    Logger.info("New guess", {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess,
      direction,
      confidence,
    });
    const guessId = await Guesses.insertAsync({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess,
      direction,
      confidence,
      state: "pending",
    });

    const content = {
      type: "message" as const,
      children: [
        { text: "" },
        {
          type: "mention" as const,
          userId: this.userId,
        },
        { text: ` submitted guess \`${guess}\`` },
      ],
    };
    await sendChatMessageInternal({ puzzleId, content, sender: undefined });

    return guessId;
  },
});
