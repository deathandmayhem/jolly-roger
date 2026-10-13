import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "PuzzleActivity.publications.forHunt",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
);
