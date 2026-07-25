import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureGoogleScriptUrl",
  z.tuple([
    z.strictObject({
      url: z.string().optional(),
    }),
  ]),
  z.void(),
);
