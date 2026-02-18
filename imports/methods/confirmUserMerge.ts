import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { sourceUser: string; targetUser: string },
  string
>("Users.methods.confirmMerge");
