import { z } from "zod";
import { createdTimestamp, foreignKey, nonEmptyString } from "./customTypes";
import type { ModelType } from "./Model";
import Model from "./Model";

const Job = z.object({
  type: nonEmptyString,
  args: z.record(z.string(), z.unknown()),
  status: z.enum(["pending", "running", "completed", "failed"]),
  claimedBy: nonEmptyString.optional(),
  claimedAt: z.date().optional(),
  completedAt: z.date().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: nonEmptyString.optional(),
  attempts: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive(),
  runAfter: z.date().optional(),
  deleteAfter: z.date().optional(),
  createdBy: foreignKey.optional(),
  createdAt: createdTimestamp,
});

const Jobs = new Model("jr_jobs", Job);
Jobs.addIndex({ status: 1, runAfter: 1, createdAt: 1 });
Jobs.addIndex({ claimedBy: 1, status: 1 });
Jobs.addIndex({ deleteAfter: 1 }, { expireAfterSeconds: 0 });
export type JobType = ModelType<typeof Jobs>;

export default Jobs;
