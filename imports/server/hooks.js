import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import Ansible from '/imports/ansible.js';

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
  onPuzzleCreated(puzzle) { // eslint-disable-line no-unused-vars
    // TODO: create Slack channel
  },

  onPuzzleSolved(puzzle) {
    const config = ServiceConfiguration.configurations.findOne({ service: 'slack' });
    if (!config) {
      Ansible.log('Not notifying Slack because Slack is not configured');
      return;
    }

    const url = Meteor.absoluteUrl(`hunts/${puzzle.hunt}/puzzles/${puzzle._id}`);
    // eslint-disable-next-line max-len
    const message = `We solved a puzzle! The answer to <${url}|${puzzle.title}> is ${puzzle.answer}`;

    let result;
    let ex;
    try {
      result = HTTP.post('https://slack.com/api/chat.postMessage', {
        params: {
          token: config.secret,
          channel: '#general',
          username: 'jolly-roger',
          link_names: 1, // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
          text: message,
        },
      });
    } catch (e) {
      ex = e;
    }

    if (ex || result.statusCode >= 400) {
      Ansible.log('Problem posting to Slack', { ex, content: result.content });
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
