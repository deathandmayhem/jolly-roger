import { Meteor } from 'meteor/meteor';
import { postSlackMessage } from '/imports/server/slack.js';

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

  runPuzzleCreatedHooks(puzzle) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleCreated) {
        hook.onPuzzleCreated(puzzle);
      }
    }
  }

  runPuzzleSolvedHooks(puzzle) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleSolved) {
        hook.onPuzzleSolved(puzzle);
      }
    }
  }

  runPuzzleNoLongerSolvedHooks(puzzle) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleNoLongerSolved) {
        hook.onPuzzleNoLongerSolved(puzzle);
      }
    }
  }
}

const SlackHooks = {
  onPuzzleCreated(puzzle) {
    const hunt = Models.Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      const message = `New puzzle created: <${url}|${puzzle.title}>`;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },

  onPuzzleSolved(puzzle) {
    const hunt = Models.Hunts.findOne(puzzle.hunt);
    if (hunt.puzzleHooksSlackChannel) {
      const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
      // eslint-disable-next-line max-len
      const message = `We solved a puzzle! The answer to <${url}|${puzzle.title}> is ${puzzle.answer}`;
      postSlackMessage(message, hunt.puzzleHooksSlackChannel, 'jolly-roger');
    }
  },

  onPuzzleNoLongerSolved(puzzle) { // eslint-disable-line no-unused-vars
    // TODO: unarchive Slack channel
  },
};

// Ditto these
const DocumentHooks = {
  onPuzzleCreated(puzzle) {
    Meteor.call('ensureDocument', puzzle);
  },
};

export { Hooks, DocumentHooks, SlackHooks };
