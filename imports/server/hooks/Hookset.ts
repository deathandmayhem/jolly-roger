interface Hookset {
  // A class defining the interface that hook event subscribers can observe.

  // We have default noop implementations for each hook here.
  // If you want to run code when one of these events occurs:
  //
  // * subclass Hookset
  // * override the onWhatever event for your subclass to do what you want
  // * instantiate your Hookset subclass and add it to the registry in
  //   imports/server/global-hooks.js

  // Triggered when a new puzzle is created.  Contains the ID of the puzzle.
  // The puzzle will already exist in the DB when this hook is called.
  onPuzzleCreated?: (puzzleId: string) => void;

  // Triggered when a puzzle is solved (e.g. a guess was marked correct and the
  // puzzle now contains an `answer`)
  onPuzzleSolved?: (puzzleId: string) => void;

  // Triggered when a puzzle that was marked solved is marked unsolved (by a
  // guess previously marked correct being unwound to a different state).
  onPuzzleNoLongerSolved?: (puzzleId: string) => void;

  // Triggered when a new message is added to a puzzle's chat (either from a
  // user or e.g. in response to a guess transitioning state).
  onChatMessageCreated?: (chatMessageId: string) => void;
}

export default Hookset;
