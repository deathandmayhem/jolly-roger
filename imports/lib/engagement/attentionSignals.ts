import { z } from "zod";

// Explicitly reported signals, mirrored as AttentionStates fields.
export const AttentionStateSignal = z.enum([
  "tabVisible",
  "windowFocused",
  "iframeFocused",
]);
export type AttentionStateSignalType = z.infer<typeof AttentionStateSignal>;

// Adds the synthesized "open" event (whether a tab is present at a given view,
// derived from context reporting) to the explicit client-reported signals.
export const AttentionSignal = z.enum([
  "open",
  ...AttentionStateSignal.options,
]);
export type AttentionSignalType = z.infer<typeof AttentionSignal>;
