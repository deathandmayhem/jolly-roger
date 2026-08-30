import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureEmailBranding",
  z.tuple([
    z.strictObject({
      from: z.string().optional(),
      enrollSubject: z.string().optional(),
      enrollMessage: z.string().optional(),
      joinSubject: z.string().optional(),
      joinMessage: z.string().optional(),
    }),
  ]),
  z.void(),
);
