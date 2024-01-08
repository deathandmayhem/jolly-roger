import TypedPublication from "./TypedPublication";

export default new TypedPublication<{
  huntId: string;
  includeDeleted?: boolean;
}>("Puzzles.publications.forPuzzleList");
