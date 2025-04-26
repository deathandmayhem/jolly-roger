import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    messageId: string;
    puzzleId: string;
    huntId: string;
    newPinState: boolean;
  },
  void
>("ChatMessages.methods.setPin");
