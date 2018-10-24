// No deps, just defines what a set of hooks looks like and a place
// to hold them.
class HooksRegistry {
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
      hook.onPuzzleCreated(puzzleId);
    }
  }

  runPuzzleSolvedHooks(puzzleId) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      hook.onPuzzleSolved(puzzleId);
    }
  }

  runPuzzleNoLongerSolvedHooks(puzzleId) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      hook.onPuzzleNoLongerSolved(puzzleId);
    }
  }
}

export default HooksRegistry;
