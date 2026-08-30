import z from "zod";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Jobs.publications.forMerge",
  z.tuple([
    z.strictObject({
      jobId: z.string(),
    }),
  ]),
);
