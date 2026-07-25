import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "ChatMessages.methods.createImageUpload",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      mimeType: z.string(),
    }),
  ]),
  z
    .object({
      publicUrl: z.string(),
      uploadUrl: z.string(),
      fields: z.record(z.string(), z.string()),
    })
    .optional(),
);
