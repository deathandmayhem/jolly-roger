import TypedMethod from "./TypedMethod";

// Allow creating the first user and making them an admin by virtue of being the
// first to show up at the server and call this method.  Assume that if someone
// else beats you to this on your own infra, you'll burn it to the ground and
// try again.
export default new TypedMethod<{ email: string; password: string }, void>(
  "Users.methods.provisionFirst",
);
