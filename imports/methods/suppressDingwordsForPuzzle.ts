import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    puzzle: string;
    hunt: string;
    dingword?: string;
    dismissUntil: date;
  },
  void
>("Users.methods.suppressDingwordForPuzzle");
