Hooks = class {
  constructor() {
    this.registeredHooks = [];
  }

  addHookSet(hookSet) {
    this.registeredHooks.push(hookSet);
  }

  removeHookSet(hookSet) {
    let index = this.registeredHooks.indexOf(hookSet);
    if (index !== -1) {
      this.registeredHooks.splice(index, 1);
    }
  }

  runPuzzleCreatedHooks(puzzle) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      let hook = this.registeredHooks[i];
      hook.onPuzzleCreated && hook.onPuzzleCreated(puzzle);
    }
  }

  runPuzzleSolvedHooks(puzzle) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      let hook = this.registeredHooks[i];
      hook.onPuzzleSolved && hook.onPuzzleSolved(puzzle);
    }
  }

  runPuzzleNoLongerSolvedHooks(puzzle) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      let hook = this.registeredHooks[i];
      hook.onPuzzleNoLongerSolved && hook.onPuzzleNoLongerSolved(puzzle);
    }
  }
};

// These could move elsewhere.
SlackHooks = {
  onPuzzleCreated(puzzle) {
    // TODO: create Slack channel
  },

  onPuzzleSolved(puzzle) {
    // TODO: archive Slack channel
  },

  onPuzzleNoLongerSolved(puzzle) {
    // TODO: unarchive Slack channel
  },
};

// Ditto these
DocumentHooks = {
  onPuzzleCreated(puzzle) {
    Meteor.call('ensureDocument', puzzle);
  },
};
