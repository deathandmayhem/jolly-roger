import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Guesses from '../../lib/models/Guesses';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { userMayUpdateGuessesForHunt } from '../../lib/permission_stubs';
import { GuessCodec } from '../../lib/schemas/Guess';
import { optional } from '../../methods/TypedMethod';
import setGuessState from '../../methods/setGuessState';
import transitionGuess from '../transitionGuess';

setGuessState.define({
  validate(arg) {
    check(arg, {
      guessId: String,
      state: Match.OneOf(...GuessCodec.props.state.types.map((t) => t.value)),
      additionalNotes: optional(String),
    });
    return arg;
  },

  async run({ guessId, state, additionalNotes }) {
    check(this.userId, String);

    const guess = await Guesses.findOneAsync(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }

    if (!userMayUpdateGuessesForHunt(await MeteorUsers.findOneAsync(this.userId), guess.hunt)) {
      throw new Meteor.Error(401, 'Must be permitted to update guesses');
    }

    Ansible.log('Transitioning guess to new state', {
      user: this.userId, guess: guess._id, state, additionalNotes,
    });
    await transitionGuess(guess, state, additionalNotes);
  },
});
