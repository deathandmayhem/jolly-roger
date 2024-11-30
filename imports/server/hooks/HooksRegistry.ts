import type { PuzzleType } from "../../lib/models/Puzzles";
import type HookSet from "./Hookset";

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
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleCreated) {
        await hook.onPuzzleCreated(puzzleId);
      }
    }
  }

  async runPuzzleUpdatedHooks(puzzleId: string, oldPuzzle: PuzzleType) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleUpdated) {
        await hook.onPuzzleUpdated(puzzleId, oldPuzzle);
      }
    }
  }

  async runPuzzleSolvedHooks(puzzleId: string, answer: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleSolved) {
        await hook.onPuzzleSolved(puzzleId, answer);
      }
    }
  }

  async runPuzzleNoLongerSolvedHooks(puzzleId: string, answer: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleNoLongerSolved) {
        await hook.onPuzzleNoLongerSolved(puzzleId, answer);
      }
    }
  }

  async runChatMessageCreatedHooks(chatMessageId: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onChatMessageCreated) {
        await hook.onChatMessageCreated(chatMessageId);
      }
    }
  }

  async runTagAddedHooks(puzzleId: string, tagId: string, adderId: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onAddPuzzleTag) {
        await hook.onAddPuzzleTag(puzzleId, tagId, adderId);
      }
    }
  }

  async runNoPuzzleViewers(puzzleId: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onNoPuzzleViewers) {
        await hook.onNoPuzzleViewers(puzzleId);
      }
    }
  }
}

export default HooksRegistry;
