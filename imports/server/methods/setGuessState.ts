import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Logger from '../../Logger';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { userMayUpdateGuessesForHunt } from '../../lib/permission_stubs';
import { GuessCodec } from '../../lib/schemas/Guess';
import setGuessState from '../../methods/setGuessState';
import transitionGuess from '../transitionGuess';
import defineMethod from './defineMethod';

defineMethod(setGuessState, {
  validate(arg) {
    check(arg, {
      guessId: String,
      state: Match.OneOf(...GuessCodec.props.state.types.map((t) => t.value)),
      additionalNotes: Match.Optional(String),
    });
    return arg;
  },

  async run({ guessId, state, additionalNotes }) {
    check(this.userId, String);

    const guess = await Guesses.findOneAsync(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }

    if (!userMayUpdateGuessesForHunt(
      await MeteorUsers.findOneAsync(this.userId),
      await Hunts.findOneAsync(guess.hunt),
    )) {
      throw new Meteor.Error(401, 'Must be permitted to update guesses');
    }

    Logger.info('Transitioning guess to new state', {
      guess: guess._id, state, additionalNotes,
    });
    await transitionGuess(guess, state, additionalNotes);
  },
});
