import Logger from "../../Logger";
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

  async runAnnouncementHooks(announcementId: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onAnnouncement) {
        await hook.onAnnouncement(announcementId);
      }
    }
  }

  async runPuzzleCreatedHooks(puzzleId: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleCreated) {
        try {
          await hook.onPuzzleCreated(puzzleId);
        } catch (error) {
          Logger.error("Error while running hook", {
            hook: "onPuzzleCreated",
            hookSet: hook.name,
            error,
          });
        }
      }
    }
  }

  async runPuzzleUpdatedHooks(puzzleId: string, oldPuzzle: PuzzleType) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleUpdated) {
        try {
          await hook.onPuzzleUpdated(puzzleId, oldPuzzle);
        } catch (error) {
          Logger.error("Error while running hook", {
            hook: "onPuzzleUpdated",
            hookSet: hook.name,
            error,
          });
        }
      }
    }
  }

  async runPuzzleSolvedHooks(puzzleId: string, answer: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleSolved) {
        try {
          await hook.onPuzzleSolved(puzzleId, answer);
        } catch (error) {
          Logger.error("Error while running hook", {
            hook: "onPuzzleSolved",
            hookSet: hook.name,
            error,
          });
        }
      }
    }
  }

  async runPuzzleNoLongerSolvedHooks(puzzleId: string, answer: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onPuzzleNoLongerSolved) {
        try {
          await hook.onPuzzleNoLongerSolved(puzzleId, answer);
        } catch (error) {
          Logger.error("Error while running hook", {
            hook: "onPuzzleNoLongerSolved",
            hookSet: hook.name,
            error,
          });
        }
      }
    }
  }

  async runChatMessageCreatedHooks(chatMessageId: string) {
    for (const hook of this.registeredHooks) {
      if (hook.onChatMessageCreated) {
        try {
          await hook.onChatMessageCreated(chatMessageId);
        } catch (error) {
          Logger.error("Error while running hook", {
            hook: "onChatMessageCreated",
            hookSet: hook.name,
            error,
          });
        }
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
}

export default HooksRegistry;
