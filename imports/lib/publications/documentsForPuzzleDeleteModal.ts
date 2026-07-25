import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Documents.publications.forPuzzleDeleteModal",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
);
