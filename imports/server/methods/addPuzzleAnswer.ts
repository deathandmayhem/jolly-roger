import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import Guesses from '../../lib/models/Guesses';
import Hunts from '../../lib/models/Hunts';
import Puzzles from '../../lib/models/Puzzles';
import addPuzzleAnswer from '../../methods/addPuzzleAnswer';
import GlobalHooks from '../GlobalHooks';
import sendChatMessageInternal from '../sendChatMessageInternal';

addPuzzleAnswer.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      answer: String,
    });
    return arg;
  },

  async run({ puzzleId, answer }) {
    check(this.userId, String);

    const puzzle = Puzzles.findOne(puzzleId);

    if (!puzzle) {
      throw new Meteor.Error(404, 'No such puzzle');
    }

    const hunt = Hunts.findOne(puzzle.hunt);

    if (!hunt) {
      throw new Meteor.Error(404, 'No such hunt');
    }

    if (hunt.hasGuessQueue) {
      throw new Meteor.Error(404, 'Hunt does not allow you to enter answers directly');
    }

    Ansible.log('New correct guess', {
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      user: this.userId,
      guess: answer,
    });
    const answerId = Guesses.insert({
      hunt: puzzle.hunt,
      puzzle: puzzleId,
      guess: answer,
      state: 'correct',
    });

    const savedAnswer = Guesses.findOne(answerId);
    if (!savedAnswer) {
      throw new Meteor.Error(404, 'No such correct guess');
    }
    await sendChatMessageInternal({
      puzzleId: savedAnswer.puzzle,
      message: `${savedAnswer.guess} was accepted as the correct answer`,
      sender: undefined,
    });
    Puzzles.update({
      _id: savedAnswer.puzzle,
    }, {
      $addToSet: {
        answers: savedAnswer.guess,
      },
    });
    await GlobalHooks.runPuzzleSolvedHooks(savedAnswer.puzzle, savedAnswer.guess);
  },
});
