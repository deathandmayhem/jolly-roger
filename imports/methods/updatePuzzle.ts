import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.update",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      title: z.string(),
      url: z.string().optional(),
      tags: z.string().array(),
      expectedAnswerCount: z.number(),
      // We accept this argument since it's provided by the form, but it's not
      // checked here - only during puzzle creation, to avoid duplicates when
      // creating new puzzles.
      allowDuplicateUrls: z.boolean().optional(),
      completedWithNoAnswer: z.boolean().optional(),
    }),
  ]),
  z.void(),
);
