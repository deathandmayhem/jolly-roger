import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Mediasoup.Consumers.methods.ack",
  z.tuple([
    z.strictObject({
      consumerId: z.string(),
    }),
  ]),
  z.void(),
);
