import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureGoogleOAuthClient",
  z.tuple([
    z.strictObject({
      clientId: z.string().optional(),
      secret: z.string().optional(),
    }),
  ]),
  z.void(),
);
