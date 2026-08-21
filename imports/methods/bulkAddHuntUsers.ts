import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Hunts.methods.bulkAddUsers",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
      emails: z.string().array(),
    }),
  ]),
  z.void(),
);
