import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Puzzles.publications.forPuzzleList",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
      includeDeleted: z.boolean().optional(),
    }),
  ]),
);
