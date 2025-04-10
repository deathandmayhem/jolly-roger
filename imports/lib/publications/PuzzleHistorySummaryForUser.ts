import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ userId: string }>(
  "PuzzleHistorySummary.publications.forUser",
);
