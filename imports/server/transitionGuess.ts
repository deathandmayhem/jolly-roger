import type { Mongo } from "meteor/mongo";
import i18n from "i18next";
import { contentFromMessage } from "../lib/models/ChatMessages";
import type { GuessType } from "../lib/models/Guesses";
import Guesses from "../lib/models/Guesses";
import Puzzles from "../lib/models/Puzzles";
import Settings from "../lib/models/Settings";
import GlobalHooks from "./GlobalHooks";
import sendChatMessageInternal from "./sendChatMessageInternal";

export default async function transitionGuess(
  guess: GuessType,
  newState: GuessType["state"],
  additionalNotes?: string,
) {
  if (newState === guess.state) return;

  const update: Mongo.Modifier<GuessType> = {
    $set: {
      state: newState,
      additionalNotes,
    },
  };
  if (!additionalNotes) {
    update.$unset = {
      additionalNotes: 1,
    };
  }
  await Guesses.updateAsync(guess._id, update);

  const lngObj = await Settings.findOneAsync({
    name: "language",
  });
  const lng = lngObj?.value.language ?? "en";
  const ns = "transitionGuess";
  const opts = { lng: lng, ns: ns };

  let stateDescription;
  switch (newState) {
    case "intermediate":
      stateDescription = i18n.t(
        "intermediateState",
        "as a correct intermediate answer",
        opts,
      );
      break;
    case "correct":
      stateDescription = i18n.t("correctState", "as correct", opts);
      break;
    case "incorrect":
      stateDescription = i18n.t("incorrectState", "as incorrect", opts);
      break;
    default:
      stateDescription = `as ${newState}`;
      break;
  }

  const message = i18n.t(
    "guessStateChanged",
    `Guess \`{{guess}}\` was marked {{state}}{{notes}}`,
    {
      ...opts,
      guess: guess.guess,
      state: stateDescription,
      notes: additionalNotes ? `: ${additionalNotes}` : "",
    },
  );
  const content = contentFromMessage(message);
  await sendChatMessageInternal({
    puzzleId: guess.puzzle,
    content,
    sender: undefined,
  });

  if (newState === "correct") {
    // Mark this puzzle as solved.
    await Puzzles.updateAsync(
      {
        _id: guess.puzzle,
      },
      {
        $addToSet: {
          answers: guess.guess,
        },
      },
    );
    await GlobalHooks.runPuzzleSolvedHooks(guess.puzzle, guess.guess);
  } else if (guess.state === "correct") {
    // Transitioning from correct -> something else: un-mark that puzzle as solved.
    await Puzzles.updateAsync(
      {
        _id: guess.puzzle,
      },
      {
        $pull: {
          answers: guess.guess,
        },
      },
    );
    await GlobalHooks.runPuzzleNoLongerSolvedHooks(guess.puzzle, guess.guess);
  }
}
