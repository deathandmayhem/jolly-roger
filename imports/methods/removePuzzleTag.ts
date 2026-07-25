import z from "zod";
import TypedMethod from "./TypedMethod";

// Note that removePuzzleTag takes a tagId rather than a tag name, since the
// client should already know the tagId.
export default new TypedMethod(
  "Puzzles.methods.removeTag",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      tagId: z.string(),
    }),
  ]),
  z.void(),
);
