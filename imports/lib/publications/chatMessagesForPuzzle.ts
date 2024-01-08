import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ puzzleId: string; huntId: string }>(
  "ChatMessages.publications.forPuzzle",
);
