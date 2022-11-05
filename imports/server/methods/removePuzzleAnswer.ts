import { check } from 'meteor/check';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import Puzzles from '../../lib/models/Puzzles';
import removePuzzleAnswer from '../../methods/removePuzzleAnswer';
import transitionGuess from '../transitionGuess';

removePuzzleAnswer.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      guessId: String,
    });
    return arg;
  },

  async run({ puzzleId, guessId }) {
    check(this.userId, String);

    const puzzle = Puzzles.findOne({
      _id: puzzleId,
    }, {
      fields: {
        hunt: 1,
      },
    });
    const huntId = puzzle && puzzle.hunt;
    const hunt = Hunts.findOne({ _id: huntId });
    if (!huntId || !hunt || hunt.hasGuessQueue) {
      throw new Error(`Hunt ${huntId} does not support self-service answers`);
    }

    const guess = Guesses.findOne({ puzzle: puzzleId, _id: guessId });
    if (!guess) return;
    await transitionGuess(guess, 'incorrect');
  },
});
