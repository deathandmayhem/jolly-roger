import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.acceptHuntTerms",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
  z.void(),
);
