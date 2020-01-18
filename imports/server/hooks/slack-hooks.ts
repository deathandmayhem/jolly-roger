import { Meteor } from 'meteor/meteor';
import Hunts from '../../lib/models/hunts';
import Puzzles from '../../lib/models/puzzles';
import { postSlackMessage } from '../slack';
import Hookset from './hookset';

const SlackHooks: Hookset = {
  onPuzzleCreated(puzzleId: string) {
    const puzzle = Puzzles.findOne(puzzleId)!;
    const hunt = Hunts.findOne(puzzle.hunt)!;
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const message = `New puzzle created: <${url}|${puzzle.title}>`;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },

  onPuzzleSolved(puzzleId: string) {
    const puzzle = Puzzles.findOne(puzzleId)!;
    const hunt = Hunts.findOne(puzzle.hunt)!;
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      // eslint-disable-next-line max-len
      let message;
      if (puzzle.expectedAnswerCount === 1 && puzzle.answers.length === 1) {
        message = `We solved a puzzle! The answer to <${url}|${puzzle.title}> is \`${puzzle.answers[0]}\``;
      } else {
        const answers = puzzle.answers.map((answer) => `\`${answer}\``).join(', ');
        if (puzzle.answers.length === puzzle.expectedAnswerCount) {
          message = `We solved a puzzle! The answers to <${url}|${puzzle.title}> are ${answers}`;
        } else {
          message = `We partially solved a puzzle!  Answers so far to <${url}|${puzzle.title}> are ${puzzle.answers.join(',')}`;
        }
      }
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },
};

export default SlackHooks;
