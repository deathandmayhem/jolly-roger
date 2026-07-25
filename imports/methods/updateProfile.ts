import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.updateProfile",
  z.tuple([
    z.strictObject({
      displayName: z.string(),
      phoneNumber: z.string().optional(),
      dingwords: z.string().array(),
      // If provided, identifies the user by enrollment token instead of
      // requiring a logged-in session. This allows updateProfile to be called
      // before Accounts.resetPassword consumes the token, making the
      // enrollment flow resilient to method retries on connection drops.
      enrollmentToken: z.string().optional(),
    }),
  ]),
  z.void(),
);
