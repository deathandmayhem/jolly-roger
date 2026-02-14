import { z } from "zod";
import { foreignKey } from "../models/customTypes";
import TypedJob from "./TypedJob";

const purgeHuntJob = new TypedJob(
  "hunt.purgeHunt",
  z.object({
    huntId: foreignKey,
  }),
  {
    result: z.object({
      itemsTotal: z.number(),
      itemsCompleted: z.number(),
      currentItemTotal: z.optional(z.number()),
      currentItemCompleted: z.optional(z.number()),
    }),
    maxAttempts: 3,
  },
);

export default purgeHuntJob;
