import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.addAnswer",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      answer: z.string(),
    }),
  ]),
  z.void(),
);
