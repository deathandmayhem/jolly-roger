import { Meteor } from 'meteor/meteor';
import { postSlackMessage } from '../slack';
import Hunts from '../../lib/models/hunts';
import Puzzles from '../../lib/models/puzzles';
import Hookset from './hookset';

const SlackHooks: Hookset = {
  onPuzzleCreated(puzzleId: string) {
    const puzzle = Puzzles.findOne(puzzleId);
    const hunt = Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const message = `New puzzle created: <${url}|${puzzle.title}>`;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },

  onPuzzleSolved(puzzleId: string) {
    const puzzle = Puzzles.findOne(puzzleId);
    const hunt = Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      // eslint-disable-next-line max-len
      const message = `We solved a puzzle! The answer to <${url}|${puzzle.title}> is \`${puzzle.answer}\``;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },
};

export default SlackHooks;
