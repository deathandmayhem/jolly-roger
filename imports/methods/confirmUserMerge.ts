import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.confirmMerge",
  z.tuple([
    z.strictObject({
      sourceUser: z.string(),
      targetUser: z.string(),
    }),
  ]),
  z.string(),
);
