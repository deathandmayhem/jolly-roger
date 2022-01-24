import HookSet from './Hookset';

// No deps, just defines what a set of hooks looks like and a place
// to hold them.
class HooksRegistry {
  public registeredHooks: HookSet[];

  constructor() {
    this.registeredHooks = [];
  }

  addHookSet(hookSet: HookSet) {
    this.registeredHooks.push(hookSet);
  }

  removeHookSet(hookSet: HookSet) {
    const index = this.registeredHooks.indexOf(hookSet);
    if (index !== -1) {
      this.registeredHooks.splice(index, 1);
    }
  }

  runPuzzleCreatedHooks(puzzleId: string) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleCreated) {
        hook.onPuzzleCreated(puzzleId);
      }
    }
  }

  runPuzzleSolvedHooks(puzzleId: string) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleSolved) {
        hook.onPuzzleSolved(puzzleId);
      }
    }
  }

  runPuzzleNoLongerSolvedHooks(puzzleId: string) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onPuzzleNoLongerSolved) {
        hook.onPuzzleNoLongerSolved(puzzleId);
      }
    }
  }

  runChatMessageCreatedHooks(chatMessageId: string) {
    for (let i = 0; i < this.registeredHooks.length; i++) {
      const hook = this.registeredHooks[i];
      if (hook.onChatMessageCreated) {
        hook.onChatMessageCreated(chatMessageId);
      }
    }
  }
}

export default HooksRegistry;
