import { Meteor } from 'meteor/meteor';
import { postSlackMessage } from './slack.js';

class Hooks {
  constructor() {
    this.registeredHooks = [];
  }

  addHookSet(hookSet) {
    this.registeredHooks.push(hookSet);
  }

  removeHookSet(hookSet) {
    const index = this.registeredHooks.indexOf(hookSet);
    if (index !== -1) {
      this.registeredHooks.splice(index, 1);
    }
  }

  runPuzzleCreatedHooks(puzzleId) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleCreated) {
        hook.onPuzzleCreated(puzzleId);
      }
    }
  }

  runPuzzleSolvedHooks(puzzleId) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleSolved) {
        hook.onPuzzleSolved(puzzleId);
      }
    }
  }

  runPuzzleNoLongerSolvedHooks(puzzleId) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleNoLongerSolved) {
        hook.onPuzzleNoLongerSolved(puzzleId);
      }
    }
  }
}

const SlackHooks = {
  onPuzzleCreated(puzzleId) {
    const puzzle = Models.Puzzles.findOne(puzzleId);
    const hunt = Models.Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const message = `New puzzle created: <${url}|${puzzle.title}>`;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },

  onPuzzleSolved(puzzleId) {
    const puzzle = Models.Puzzles.findOne(puzzleId);
    const hunt = Models.Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      // eslint-disable-next-line max-len
      const message = `We solved a puzzle! The answer to <${url}|${puzzle.title}> is \`${puzzle.answer}\``;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },

  onPuzzleNoLongerSolved(puzzleId) { // eslint-disable-line no-unused-vars
    // TODO: unarchive Slack channel
  },
};

export { Hooks, SlackHooks };
