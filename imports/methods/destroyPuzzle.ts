import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    puzzleId: string;
    replacedBy?: string;
    copySheetsToReplacement: boolean;
  },
  void
>("Puzzles.methods.destroy");
