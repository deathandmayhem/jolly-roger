import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Logger from "../../Logger";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { userIsInHunt } from "../../lib/permission_stubs";
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
    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user) {
      throw new Meteor.Error(500, "Logged-in user not found");
    }

    const puzzle = await Puzzles.findOneAsync(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, "No such puzzle");
    }

    const hunt = await Hunts.findOneAsync(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, "No such hunt");
    }

    if (!userIsInHunt(user, hunt._id)) {
      throw new Meteor.Error(
        403,
        `You are not a member of the hunt ${hunt._id} and thus cannot submit guesses to puzzles in that hunt`,
      );
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
