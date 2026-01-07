import type { Mongo } from "meteor/mongo";
import { answerify } from "../model-helpers";
import { contentFromMessage } from "../lib/models/ChatMessages";
import type { GuessType } from "../lib/models/Guesses";
import Guesses from "../lib/models/Guesses";
import Puzzles from "../lib/models/Puzzles";
import GlobalHooks from "./GlobalHooks";
import sendChatMessageInternal from "./sendChatMessageInternal";

export default async function transitionGuess(
  guess: GuessType,
  newState: GuessType["state"],
  additionalNotes?: string,
  correctAnswer?: string,
) {
  if (newState === guess.state) return;

  let guessText = guess.guess;
  if (correctAnswer) {
    guessText = answerify(correctAnswer);
  }

  const update: Mongo.Modifier<GuessType> = {
    $set: {
      state: newState,
      additionalNotes,
      guess: guessText,
    },
  };
  if (!additionalNotes) {
    update.$unset = {
      additionalNotes: 1,
    };
  }
  await Guesses.updateAsync(guess._id, update);

  let stateDescription;
  switch (newState) {
    case "intermediate":
      stateDescription = "as a correct intermediate answer";
      break;
    default:
      stateDescription = `as ${newState}`;
      break;
  }
  if (correctAnswer) {
    stateDescription = `as correct with changes (submitted as \`${guess.guess}\`)`;
  }
  const message = `Guess \`${guessText}\` was marked ${stateDescription}${
    additionalNotes ? `: ${additionalNotes}` : ""
  }`;
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
          answers: guessText,
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
