import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Guesses.method.create",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      guess: z.string(),
      direction: z.number(),
      confidence: z.number(),
    }),
  ]),
  z.string(),
);
