import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.undestroy",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
    }),
  ]),
  z.void(),
);
