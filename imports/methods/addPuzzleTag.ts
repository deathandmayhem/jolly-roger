import z from "zod";
import TypedMethod from "./TypedMethod";

// addPuzzleTag takes a tag name, rather than a tag ID, so we can avoid doing
// two round-trips for tag creation.
export default new TypedMethod(
  "Puzzles.methods.addTag",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      tagName: z.string(),
    }),
  ]),
  z.void(),
);
