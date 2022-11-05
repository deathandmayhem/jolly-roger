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

  async runPuzzleCreatedHooks(puzzleId: string) {
    await this.registeredHooks.reduce(async (p, hook) => {
      await p;
      if (hook.onPuzzleCreated) {
        await hook.onPuzzleCreated(puzzleId);
      }
    }, Promise.resolve());
  }

  async runPuzzleSolvedHooks(puzzleId: string) {
    await this.registeredHooks.reduce(async (p, hook) => {
      await p;
      if (hook.onPuzzleSolved) {
        await hook.onPuzzleSolved(puzzleId);
      }
    }, Promise.resolve());
  }

  async runPuzzleNoLongerSolvedHooks(puzzleId: string) {
    await this.registeredHooks.reduce(async (p, hook) => {
      await p;
      if (hook.onPuzzleNoLongerSolved) {
        await hook.onPuzzleNoLongerSolved(puzzleId);
      }
    }, Promise.resolve());
  }

  async runChatMessageCreatedHooks(chatMessageId: string) {
    await this.registeredHooks.reduce(async (p, hook) => {
      await p;
      if (hook.onChatMessageCreated) {
        await hook.onChatMessageCreated(chatMessageId);
      }
    }, Promise.resolve());
  }
}

export default HooksRegistry;
