import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ tagId: string; name: string }, void>(
  "Tags.methods.rename",
);
