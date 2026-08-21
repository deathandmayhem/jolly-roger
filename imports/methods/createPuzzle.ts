import z from "zod";
import GdriveMimeTypes from "../lib/GdriveMimeTypes";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Puzzles.methods.create",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
      title: z.string(),
      url: z.string().optional(),
      tags: z.string().array(),
      expectedAnswerCount: z.number(),
      docType: z.enum(
        Object.keys(GdriveMimeTypes) as (keyof typeof GdriveMimeTypes)[],
      ),
      allowDuplicateUrls: z.boolean().optional(),
      completedWithNoAnswer: z.boolean().optional(),
    }),
  ]),
  z.string(),
);
