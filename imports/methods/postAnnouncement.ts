import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Announcements.methods.post",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
      message: z.string(),
    }),
  ]),
  z.void(),
);
