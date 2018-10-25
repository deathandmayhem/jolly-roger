
/* eslint-disable no-unused-vars */
class Hookset {
  // A class defining the interface that hook event subscribers can observe.

  // We have default noop implementations for each hook here.
  // If you want to run code when one of these events occurs:
  //
  // * subclass Hookset
  // * override the onWhatever event for your subclass to do what you want
  // * instantiate your Hookset subclass and add it to the registry in
  //   imports/server/global-hooks.js

  onPuzzleCreated(puzzleId) {
    // Triggered when a new puzzle is created.  Contains the ID of the puzzle.
    // The puzzle will already exist in the DB when this hook is called.
  }

  onPuzzleSolved(puzzleId) {
    // Triggered when a puzzle is solved (e.g. a guess was marked correct and the
    // puzzle now contains an `answer`)
  }

  onPuzzleNoLongerSolved(puzzleId) {
    // Triggered when a puzzle that was marked solved is marked unsolved (by a
    // guess previously marked correct being unwound to a different state).
  }
}
/* eslint-enable no-unused-vars */

export default Hookset;
