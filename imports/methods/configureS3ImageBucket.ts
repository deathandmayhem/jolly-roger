import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureS3ImageBucket",
  z.tuple([
    z.strictObject({
      bucketName: z.string().optional(),
    }),
  ]),
  z.void(),
);
