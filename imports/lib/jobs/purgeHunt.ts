import { z } from "zod";
import { foreignKey } from "../models/customTypes";
import TypedJob from "./TypedJob";

const purgeHunt = new TypedJob("hunt.purgeHunt", {
  args: z.object({
    huntId: foreignKey,
  }),
  resultSchema: z.object({
    itemsTotal: z.number(), // How many total units of work do we need to complete?
    itemsCompleted: z.number(), // How many units of work have we completed so far?
    currentItemTotal: z.optional(z.number()), // Within the current unit of work, how many substeps are involved?
    currentItemCompleted: z.optional(z.number()), // And how many have we completed so far?
  }),
  maxAttempts: 3,
});

export default purgeHunt;
