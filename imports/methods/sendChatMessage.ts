import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "ChatMessages.methods.send",
  z.tuple([
    z.strictObject({
      puzzleId: z.string(),
      content: z.string(),
    }),
  ]),
  z.void(),
);
