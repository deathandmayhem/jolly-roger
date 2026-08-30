import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Documents.methods.createImageUpload",
  z.tuple([
    z.strictObject({
      documentId: z.string(),
      filename: z.string(),
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
