import z from "zod";
import TypedMethod from "./TypedMethod";

// Allow creating the first user and making them an admin by virtue of being the
// first to show up at the server and call this method.  Assume that if someone
// else beats you to this on your own infra, you'll burn it to the ground and
// try again.
export default new TypedMethod(
  "Users.methods.provisionFirst",
  z.tuple([
    z.strictObject({
      email: z.string(),
      password: z.string(),
    }),
  ]),
  z.void(),
);
