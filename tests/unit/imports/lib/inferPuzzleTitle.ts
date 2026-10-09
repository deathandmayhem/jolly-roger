import { assert } from "chai";
import inferPuzzleTitle from "../../../../imports/lib/inferPuzzleTitle";

describe("inferPuzzleTitle", function () {
  it("returns empty string for empty/null/undefined input", function () {
    assert.strictEqual(inferPuzzleTitle(""), "");
    assert.strictEqual(inferPuzzleTitle(undefined), "");
    assert.strictEqual(inferPuzzleTitle(null), "");
  });

  it("infers titles correctly without custom hunt match", function () {
    assert.strictEqual(inferPuzzleTitle("  Puzzle Title  "), "Puzzle Title");
    assert.strictEqual(
      inferPuzzleTitle("Puzzle Title", "https://example.com/puzzles/123"),
      "Puzzle Title",
    );
    assert.strictEqual(
      inferPuzzleTitle("Puzzle Boat 9 | Puzzle Title", "not a valid url"),
      "Puzzle Boat 9 | Puzzle Title",
    );
  });

  it("infers Puzzle Boats titles correctly", function () {
    assert.strictEqual(
      inferPuzzleTitle(
        "Puzzle Boat 9 | Puzzle Title",
        "https://pandamagazine.com/island/boat9/puzzle42",
      ),
      "Puzzle Title",
    );
    assert.strictEqual(
      inferPuzzleTitle(
        "Puzzle Boat 8 | Puzzle Name | With Pipe",
        "https://pandamagazine.com/island/boat8/puzzle1",
      ),
      "Puzzle Name | With Pipe",
    );
  });

  it("infers Microsoft Puzzle Server titles correctly", function () {
    assert.strictEqual(
      inferPuzzleTitle(
        "Puzzle Title - Microsoft Puzzle Server",
        "https://puzzlehunt.azurewebsites.net/puzzles/crossword",
      ),
      "Puzzle Title",
    );
    assert.strictEqual(
      inferPuzzleTitle(
        "Puzzle Name - With Hyphen - Microsoft Puzzle Server",
        "https://puzzlehunt.azurewebsites.net/puzzles/meta",
      ),
      "Puzzle Name - With Hyphen",
    );
  });
});
