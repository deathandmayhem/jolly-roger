import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "UploadTokens.methods.generate",
  z.tuple([
    z.strictObject({
      assetName: z.string(),
      assetMimeType: z.string(),
    }),
  ]),
  z.string(),
);
