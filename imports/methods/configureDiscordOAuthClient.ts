import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureDiscordOAuthClient",
  z.tuple([
    z.strictObject({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }),
  ]),
  z.void(),
);
