import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    puzzleId: string;
    content: string;
    parentId?: string | null;
  },
  void
>("ChatMessages.methods.send");
