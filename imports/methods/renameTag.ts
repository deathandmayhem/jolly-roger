import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Tags.methods.rename",
  z.tuple([
    z.strictObject({
      tagId: z.string(),
      name: z.string(),
    }),
  ]),
  z.void(),
);
