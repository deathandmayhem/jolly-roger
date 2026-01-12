import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { tagId: string; name: string; alias: boolean },
  void
>("Tags.methods.rename");
