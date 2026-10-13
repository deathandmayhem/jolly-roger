import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.method.promoteOperator",
  z.tuple([
    z.strictObject({
      targetUserId: z.string(),
      huntId: z.string(),
    }),
  ]),
  z.void(),
);
