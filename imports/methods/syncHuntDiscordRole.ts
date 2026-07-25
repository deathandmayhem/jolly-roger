import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Hunts.methods.syncDiscordRole",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
  z.void(),
);
