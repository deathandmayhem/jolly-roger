import TypedMethod from "./TypedMethod";

// Note that removePuzzleTag takes a tagId rather than a tag name, since the
// client should already know the tagId.
export default new TypedMethod<{ puzzleId: string; tagId: string }, void>(
  "Puzzles.methods.removeTag",
);
