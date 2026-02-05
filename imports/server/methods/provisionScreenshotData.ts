import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import FixtureHunt from "../../FixtureHunt";
import isAdmin from "../../lib/isAdmin";
import Documents from "../../lib/models/Documents";
import MeteorUsers from "../../lib/models/MeteorUsers";
import bookmarkPuzzle from "../../methods/bookmarkPuzzle";
import createGuess from "../../methods/createGuess";
import provisionScreenshotData from "../../methods/provisionScreenshotData";
import sendChatMessage from "../../methods/sendChatMessage";
import setGuessState from "../../methods/setGuessState";
import {
  BOOKMARK_PUZZLE_TITLE,
  CHAT_MESSAGES,
  CHAT_PUZZLE_TITLE,
  GOOGLE_SHEET_ID,
  GUESS_PUZZLE_TITLE,
  SECONDARY_USER,
} from "../../ScreenshotFixture";
import defineMethod from "./defineMethod";

function findFixturePuzzle(title: string): string {
  const puzzle = FixtureHunt.puzzles.find((p) => p.title === title);
  if (!puzzle) throw new Error(`Fixture puzzle not found: ${title}`);
  return puzzle._id;
}

defineMethod(provisionScreenshotData, {
  async run() {
    check(this.userId, String);

    if (!Meteor.isDevelopment) {
      throw new Meteor.Error(
        403,
        "This method is only available in development mode",
      );
    }

    if (!isAdmin(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to provision screenshot data");
    }

    // Create secondary user and add them to the fixture hunt
    const secondaryUserId = await Accounts.createUserAsync({
      email: SECONDARY_USER.email,
      password: SECONDARY_USER.password,
    });
    await MeteorUsers.updateAsync(secondaryUserId, {
      $set: { displayName: SECONDARY_USER.displayName },
      $addToSet: { hunts: FixtureHunt._id },
    });

    const puzzleId = findFixturePuzzle(CHAT_PUZZLE_TITLE);
    const warmAndFuzzyId = findFixturePuzzle(BOOKMARK_PUZZLE_TITLE);
    const fowltyTowersId = findFixturePuzzle(GUESS_PUZZLE_TITLE);

    // Link a pre-made Google Sheet to the puzzle
    await Documents.insertAsync({
      hunt: FixtureHunt._id,
      puzzle: puzzleId,
      provider: "google" as const,
      value: { type: "spreadsheet" as const, id: GOOGLE_SHEET_ID },
    });

    // Chat messages demonstrating rich formatting
    for (const text of CHAT_MESSAGES) {
      await sendChatMessage.callPromise({
        puzzleId,
        content: JSON.stringify({
          type: "message",
          children: [{ text }],
        }),
      });
    }

    // A message with an @-mention
    await sendChatMessage.callPromise({
      puzzleId,
      content: JSON.stringify({
        type: "message",
        children: [
          { text: "Hey " },
          { type: "mention", userId: secondaryUserId },
          { text: ", what do you think about this one?" },
        ],
      }),
    });

    // Bookmarks
    await bookmarkPuzzle.callPromise({
      puzzleId,
      bookmark: true,
    });
    await bookmarkPuzzle.callPromise({
      puzzleId: warmAndFuzzyId,
      bookmark: true,
    });

    // Incorrect guess on Fowlty Towers for the guess-submission screenshot
    const fowltyGuessId = await createGuess.callPromise({
      puzzleId: fowltyTowersId,
      guess: "BRAZEN EVIL",
      direction: 10,
      confidence: 50,
    });
    await setGuessState.callPromise({
      guessId: fowltyGuessId,
      state: "incorrect",
    });
  },
});
