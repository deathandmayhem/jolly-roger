import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureGdriveCreds",
  z.tuple([
    z.strictObject({
      key: z.string(),
      secret: z.string(),
    }),
  ]),
  z.void(),
);
