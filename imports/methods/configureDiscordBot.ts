import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureDiscordBot",
  z.tuple([
    z.strictObject({
      token: z.string().optional(),
    }),
  ]),
  z.void(),
);
