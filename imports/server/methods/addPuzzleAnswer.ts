import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import i18n from "i18next";
import Logger from "../../Logger";
import { contentFromMessage } from "../../lib/models/ChatMessages";
import Guesses from "../../lib/models/Guesses";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import { userIsInHunt } from "../../lib/permission_stubs";
import addPuzzleAnswer from "../../methods/addPuzzleAnswer";
import { answerify } from "../../model-helpers";
import GlobalHooks from "../GlobalHooks";
import { serverLanguage } from "../lang";
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

  async run({ puzzleId, answer: rawAnswer }) {
    check(this.userId, String);
    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user) {
      throw new Meteor.Error(500, "Logged-in user not found");
    }

    // Normalize up front so the $ne filter, $addToSet, chat message, and
    // hooks all use the same canonical form.
    const answer = answerify(rawAnswer);

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
        `You are not a member of the hunt ${hunt._id} and thus cannot add answers to puzzles in that hunt`,
      );
    }

    if (hunt.hasGuessQueue) {
      throw new Meteor.Error(
        404,
        "Hunt does not allow you to enter answers directly",
      );
    }

    // Use $ne as an atomic guard so that two concurrent submissions of
    // the same answer race on this update and exactly one wins.
    const updated = await Puzzles.updateAsync(
      {
        _id: puzzleId,
        answers: { $ne: answer },
      },
      {
        $addToSet: {
          answers: answer,
        },
      },
    );

    if (updated === 0) {
      throw new Meteor.Error(409, "Answer already exists for this puzzle");
    }

    Logger.info("New correct guess", {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      user: this.userId,
      guess: answer,
    });
    await Guesses.insertAsync({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess: answer,
      state: "correct",
    });

    const message = i18n.t(
      "puzzle.answerOrGuess.acceptedAnswer",
      `\`{{guess}}\` was accepted as the correct answer`,
      { lng: serverLanguage, guess: answer },
    );
    const content = contentFromMessage(message);
    await sendChatMessageInternal({
      puzzleId,
      content,
      sender: undefined,
    });
    await GlobalHooks.runPuzzleSolvedHooks(puzzleId, answer);
  },
});
