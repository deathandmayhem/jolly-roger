import { Meteor } from 'meteor/meteor';
import { postSlackMessage } from '../slack.js';
import Hunts from '../../lib/models/hunts.js';
import Puzzles from '../../lib/models/puzzles.js';
import Hookset from './hookset.js';

class SlackHooks extends Hookset {
  onPuzzleCreated(puzzleId) {
    const puzzle = Puzzles.findOne(puzzleId);
    const hunt = Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const message = `New puzzle created: <${url}|${puzzle.title}>`;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  }

  onPuzzleSolved(puzzleId) {
    const puzzle = Puzzles.findOne(puzzleId);
    const hunt = Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      // eslint-disable-next-line max-len
      const message = `We solved a puzzle! The answer to <${url}|${puzzle.title}> is \`${puzzle.answer}\``;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  }

  onPuzzleNoLongerSolved(puzzleId) { // eslint-disable-line no-unused-vars
  }
}

export default SlackHooks;
