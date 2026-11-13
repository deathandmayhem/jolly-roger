import type { AttentionStateSignalType } from "../lib/engagement/attentionSignals";
import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  {
    tab: string;
    signal: AttentionStateSignalType;
    value: boolean;
    dedupKey: string;
  },
  void
>("AttentionStates.methods.reportTransition");
