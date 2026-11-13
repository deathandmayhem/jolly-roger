import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { tab: string; huntId?: string; puzzleId?: string; dedupKey: string },
  void
>("AttentionStates.methods.reportContext");
