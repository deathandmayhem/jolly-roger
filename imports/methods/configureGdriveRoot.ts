import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureGdriveRoot",
  z.tuple([
    z.strictObject({
      root: z.string().optional(),
    }),
  ]),
  z.void(),
);
