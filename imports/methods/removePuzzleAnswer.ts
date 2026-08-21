import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.removeAnswer",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      guessId: z.string(),
    }),
  ]),
  z.void(),
);
