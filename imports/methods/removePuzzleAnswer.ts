import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ puzzleId: string; guessId: string }, void>(
  "Puzzles.methods.removeAnswer",
);
