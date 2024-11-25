import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ tagId: string, puzzleId: string }, void>(
  "Puzzles.methods.addTag",
);
