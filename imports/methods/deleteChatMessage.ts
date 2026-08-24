import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    chatMessageId: string;
  },
  void
>("ChatMessages.methods.delete");
