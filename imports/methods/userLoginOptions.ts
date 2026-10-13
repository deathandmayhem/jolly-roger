import z from "zod";
import TypedMethod from "./TypedMethod";

const UserLoginOptionsResult = z.object({
  exists: z.boolean(),
  loginMethods: z.string().array().optional(),
});
export type UserLoginOptionsResult = z.infer<typeof UserLoginOptionsResult>;

export default new TypedMethod(
  "Users.methods.loginOptions",
  z.tuple([
    z.strictObject({
      email: z.string(),
      invitationCode: z.string(),
    }),
  ]),
  UserLoginOptionsResult,
);
