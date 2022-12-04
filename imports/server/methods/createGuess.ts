import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import createGuess from '../../methods/createGuess';
import sendChatMessageInternal from '../sendChatMessageInternal';

createGuess.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      guess: String,
      direction: Number,
      confidence: Number,
    });
    return arg;
  },

  async run({
    puzzleId, guess, direction, confidence,
  }) {
    check(this.userId, String);

    const puzzle = Puzzles.findOne(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, 'No such puzzle');
    }

    const hunt = Hunts.findOne(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, 'No such hunt');
    }

    if (!hunt.hasGuessQueue) {
      throw new Meteor.Error(404, 'Hunt does not allow you to submit guesses, only answers');
    }

    Ansible.log('New guess', {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      user: this.userId,
      guess,
      direction,
      confidence,
    });
    const guessId = Guesses.insert({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess,
      direction,
      confidence,
      state: 'pending',
    });

    const user = MeteorUsers.findOne(this.userId)!;
    const guesserDisplayName = user.displayName ?? '(no display name given)';
    const message = `${guesserDisplayName} submitted guess "${guess}"`;
    await sendChatMessageInternal({ puzzleId, message, sender: undefined });

    return guessId;
  },
});
