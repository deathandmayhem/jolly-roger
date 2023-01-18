import { check } from 'meteor/check';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import Puzzles from '../../lib/models/Puzzles';
import removePuzzleAnswer from '../../methods/removePuzzleAnswer';
import transitionGuess from '../transitionGuess';
import defineMethod from './defineMethod';

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

    const puzzle = await Puzzles.findOneAsync({
      _id: puzzleId,
    }, {
      fields: {
        hunt: 1,
      },
    });
    const huntId = puzzle?.hunt;
    const hunt = await Hunts.findOneAsync({ _id: huntId });
    if (!huntId || !hunt || hunt.hasGuessQueue) {
      throw new Error(`Hunt ${huntId} does not support self-service answers`);
    }

    const guess = await Guesses.findOneAsync({ puzzle: puzzleId, _id: guessId });
    if (!guess) return;
    await transitionGuess(guess, 'incorrect');
  },
});
