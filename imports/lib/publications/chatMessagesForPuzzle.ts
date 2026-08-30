import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "ChatMessages.publications.forPuzzle",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      huntId: z.string(),
    }),
  ]),
);
