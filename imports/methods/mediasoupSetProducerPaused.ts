import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Mediasoup.ProducerClients.methods.setPaused",
  z.tuple([
    z.strictObject({
      mediasoupProducerId: z.string(),
      paused: z.boolean(),
    }),
  ]),
  z.void(),
);
