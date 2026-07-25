import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.linkDiscordAccount",
  z.tuple([
    z.strictObject({
      key: z.string(),
      secret: z.string(),
    }),
  ]),
  z.void(),
);
