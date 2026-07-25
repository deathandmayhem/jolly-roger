import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Mediasoup.Peers.methods.remoteMute",
  z.tuple([
    z.strictObject({
      peerId: z.string(),
    }),
  ]),
  z.void(),
);
