import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Guesses.publications.forGuessQueue",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
);
