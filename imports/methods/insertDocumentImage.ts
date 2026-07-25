import z from "zod";
import TypedMethod from "./TypedMethod";

const UploadImageSource = z.strictObject({
  source: z.literal("upload"),
  filename: z.string(),
  // base64-encoded data url
  contents: z.string(),
});

const LinkImageSource = z.strictObject({
  source: z.literal("link"),
  url: z.string(),
});

const ImageSource = z.union([UploadImageSource, LinkImageSource]);
export type ImageSource = z.infer<typeof ImageSource>;

export default new TypedMethod(
  "Documents.methods.insertImage",
  z.tuple([
    z.strictObject({
      documentId: z.string(),
      sheetId: z.number(),
      image: ImageSource,
    }),
  ]),
  z.void(),
);
