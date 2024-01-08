import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import { contentFromMessage } from "../../lib/models/ChatMessages";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import Puzzles from "../../lib/models/Puzzles";
import addPuzzleAnswer from "../../methods/addPuzzleAnswer";
import GlobalHooks from "../GlobalHooks";
import sendChatMessageInternal from "../sendChatMessageInternal";
import defineMethod from "./defineMethod";

defineMethod(addPuzzleAnswer, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      answer: String,
    });
    return arg;
  },

  async run({ puzzleId, answer }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneAsync(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, "No such puzzle");
    }

    const hunt = await Hunts.findOneAsync(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, "No such hunt");
    }

    if (hunt.hasGuessQueue) {
      throw new Meteor.Error(
        404,
        "Hunt does not allow you to enter answers directly",
      );
    }

    Logger.info("New correct guess", {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      user: this.userId,
      guess: answer,
    });
    const answerId = await Guesses.insertAsync({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess: answer,
      state: "correct",
    });

    const savedAnswer = await Guesses.findOneAsync(answerId);
    if (!savedAnswer) {
      throw new Meteor.Error(404, "No such correct guess");
    }
    const message = `\`${savedAnswer.guess}\` was accepted as the correct answer`;
    const content = contentFromMessage(message);
    await sendChatMessageInternal({
      puzzleId: savedAnswer.puzzle,
      content,
      sender: undefined,
    });
    await Puzzles.updateAsync(
      {
        _id: savedAnswer.puzzle,
      },
      {
        $addToSet: {
          answers: savedAnswer.guess,
        },
      },
    );
    await GlobalHooks.runPuzzleSolvedHooks(
      savedAnswer.puzzle,
      savedAnswer.guess,
    );
  },
});
