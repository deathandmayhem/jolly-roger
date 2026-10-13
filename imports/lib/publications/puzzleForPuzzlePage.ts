import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Puzzles.publications.forPuzzlePage",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      huntId: z.string(),
    }),
  ]),
);
