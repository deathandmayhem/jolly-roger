import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ huntId: string; email: string }, void>(
  "Hunts.methods.addUser",
);
