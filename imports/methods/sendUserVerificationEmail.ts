import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ email: string }, void>(
  "Users.methods.sendUserVerificationEmail",
);
