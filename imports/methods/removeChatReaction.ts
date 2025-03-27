import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    parentId: string;
    reaction: string;
    sender: string;
  },
  void
>("ChatMessages.methods.removeReact");
