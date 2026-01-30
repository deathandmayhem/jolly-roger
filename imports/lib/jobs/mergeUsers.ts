import { z } from "zod";
import { foreignKey } from "../typedModel/customTypes";
import TypedJob from "./TypedJob";

const mergeUsers = new TypedJob("user.mergeUsers", {
  args: z.object({
    sourceUser: foreignKey,
    targetUser: foreignKey,
  }),
  resultSchema: z.object({
    status: z.enum(["active", "background", "done"]),
    step: z.string(),
    stepsCompleted: z.number(),
    stepsTotal: z.number(),
    substepsCompleted: z.number().optional(),
    substepsTotal: z.number().optional(),
  }),
  maxAttempts: 3,
});

export default mergeUsers;
