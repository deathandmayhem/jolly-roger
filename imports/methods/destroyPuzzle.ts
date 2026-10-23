import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.destroy",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      replacedBy: z.string().optional(),
      copySheetsToReplacement: z.boolean(),
    }),
  ]),
  z.void(),
);
