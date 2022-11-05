import Guesses from '../lib/models/Guesses';
import Puzzles from '../lib/models/Puzzles';
import { GuessType } from '../lib/schemas/Guess';
import GlobalHooks from './GlobalHooks';
import sendChatMessageInternal from './sendChatMessageInternal';

export default async function transitionGuess(guess: GuessType, newState: GuessType['state']) {
  if (newState === guess.state) return;

  Guesses.update({
    _id: guess._id,
  }, {
    $set: {
      state: newState,
    },
  });
  const message = `Guess ${guess.guess} was marked ${newState}`;
  await sendChatMessageInternal({ puzzleId: guess.puzzle, message, sender: undefined });

  if (newState === 'correct') {
    // Mark this puzzle as solved.
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $addToSet: {
        answers: guess.guess,
      },
    });
    await GlobalHooks.runPuzzleSolvedHooks(guess.puzzle);
  } else if (guess.state === 'correct') {
    // Transitioning from correct -> something else: un-mark that puzzle as solved.
    Puzzles.update({
      _id: guess.puzzle,
    }, {
      $pull: {
        answers: guess.guess,
      },
    });
    await GlobalHooks.runPuzzleNoLongerSolvedHooks(guess.puzzle);
  }
}
