import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "ChatMessages.publications.forFirehose",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
);
