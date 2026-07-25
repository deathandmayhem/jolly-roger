import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.bookmark",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      bookmark: z.boolean(),
    }),
  ]),
  z.void(),
);
