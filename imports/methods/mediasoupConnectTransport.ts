import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Mediasoup.Transports.methods.connect",
  z.tuple([
    z.strictObject({
      transportId: z.string(),
      dtlsParameters: z.string(),
    }),
  ]),
  z.void(),
);
