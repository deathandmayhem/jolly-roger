import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    id: string;
  },
  void
>("ChatMessages.methods.remove");
