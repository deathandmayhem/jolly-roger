import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ userId: string; puzzleId: string }>(
  "Puzzles.publications.historyForUser",
);
