import { z } from "zod";

// Explicitly reported signals, mirrored as AttentionStates fields.
export const AttentionStateSignal = z.enum([
  "tabVisible",
  "windowFocused",
  "iframeFocused",
]);
export type AttentionStateSignalType = z.infer<typeof AttentionStateSignal>;
