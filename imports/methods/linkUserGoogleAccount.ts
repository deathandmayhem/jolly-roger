import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.linkGoogleAccount",
  z.tuple([
    z.strictObject({
      key: z.string(),
      secret: z.string(),
    }),
  ]),
  z.void(),
);
