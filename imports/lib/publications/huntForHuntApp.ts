import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Hunts.publications.forHuntApp",
  z.tuple([
    z.strictObject({
      huntId: z.string(),
    }),
  ]),
);
