import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ tagId: string }, void>(
  "Tags.methods.destroy",
);
