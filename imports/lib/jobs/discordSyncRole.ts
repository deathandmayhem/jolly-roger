import { z } from "zod";
import { foreignKey } from "../models/customTypes";
import TypedJob from "./TypedJob";

const discordSyncRoleJob = new TypedJob(
  "discord.syncRole",
  z.object({
    huntId: foreignKey,
    userIds: foreignKey.array(),
    force: z.boolean(),
  }),
  {
    maxAttempts: 3,
  },
);

export default discordSyncRoleJob;
