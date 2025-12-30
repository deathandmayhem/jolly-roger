import type { PuzzleType } from "../../lib/models/Puzzles";

interface Hookset {
  // A TypeScript interface that hook event subscribers must satisfy.

  // If you want to run code when one of these events occurs:
  //
  // * Define an object of type Hookset
  // * Include the onWhatever properties for events you want to receive
  // * Add your object to the registry in imports/server/hooks/GlobalHooks.ts

  name: string;

  // Triggered when a new announcement is posted.  Contains the ID of the
  // announcement
  onAnnouncement?: (announcementId: string) => void | Promise<void>;

  // Triggered when a new puzzle is created.  Contains the ID of the puzzle.
  // The puzzle will already exist in the DB when this hook is called.
  onPuzzleCreated?: (puzzleId: string) => void | Promise<void>;

  // Triggered when the puzzle is changed. Includes the old puzzle as fetched
  // from the database prior to modification (which could be racy)
  onPuzzleUpdated?: (
    puzzleId: string,
    oldPuzzle: PuzzleType,
  ) => void | Promise<void>;

  // Triggered when a puzzle is solved (e.g. a guess was marked correct and the
  // puzzle now contains an `answer`)
  onPuzzleSolved?: (puzzleId: string, answer: string) => void | Promise<void>;

  // Triggered when a puzzle that was marked solved is marked unsolved (by a
  // guess previously marked correct being unwound to a different state).
  onPuzzleNoLongerSolved?: (
    puzzleId: string,
    answer: string,
  ) => void | Promise<void>;

  // Triggered when a new message is added to a puzzle's chat (either from a
  // user or e.g. in response to a guess transitioning state).
  onChatMessageCreated?: (chatMessageId: string) => void | Promise<void>;

  // Triggered when a tag is added to a puzzle
  onAddPuzzleTag?: (
    puzzleId: string,
    tagId: string,
    adderId: string,
  ) => void | Promise<void>;

  // Triggered when a tag is removed from a puzzle
  onRemovePuzzleTag?: (
    puzzleId: string,
    tagName: string,
  ) => void | Promise<void>;
}

export default Hookset;
