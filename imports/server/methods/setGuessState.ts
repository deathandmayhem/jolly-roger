import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Guesses from '../../lib/models/Guesses';
import { userMayUpdateGuessesForHunt } from '../../lib/permission_stubs';
import { GuessCodec } from '../../lib/schemas/Guess';
import setGuessState from '../../methods/setGuessState';
import transitionGuess from '../transitionGuess';

setGuessState.define({
  validate(arg) {
    check(arg, {
      guessId: String,
      state: Match.OneOf(...GuessCodec.props.state.types.map((t) => t.value)),
    });
    return arg;
  },

  run({ guessId, state }) {
    const guess = Guesses.findOne(guessId);
    if (!guess) {
      throw new Meteor.Error(404, 'No such guess');
    }

    if (!userMayUpdateGuessesForHunt(this.userId, guess.hunt)) {
      throw new Meteor.Error(401, 'Must be permitted to update guesses');
    }

    Ansible.log(
      'Transitioning guess to new state',
      { user: this.userId, guess: guess._id, state }
    );
    transitionGuess(guess, state);
  },
});
