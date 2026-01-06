import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    puzzle: string;
    hunt: string;
    dismissUntil: date;
  },
  void
>("Users.methods.dismissDingsForPuzzle");
