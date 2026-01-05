import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    puzzle: string;
    hunt: string;
    dingword?: string;
  },
  void
>("Users.methods.suppressDingwordForPuzzle");
