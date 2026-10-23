import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "APIKeys.method.destroy",
  z.tuple([
    z.strictObject({
      // the _id, not the key itself
      apiKeyId: z.string(),
      // If provided, the user who owns the API key
      forUser: z.string().optional(),
    }),
  ]),
  z.void(),
);
