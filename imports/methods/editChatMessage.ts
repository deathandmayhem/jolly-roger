import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    chatMessageId: string;
    content: string;
  },
  void
>("ChatMessages.methods.edit");
