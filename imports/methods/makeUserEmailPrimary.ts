import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.makeUserEmailPrimary",
  z.tuple([
    z.strictObject({
      email: z.string(),
    }),
  ]),
  z.void(),
);
