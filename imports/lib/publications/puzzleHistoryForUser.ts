import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ userId: string }>(
  "Puzzles.publications.historyForUser",
);
