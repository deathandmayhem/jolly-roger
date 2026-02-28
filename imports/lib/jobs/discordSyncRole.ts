import { z } from "zod";
import { foreignKey } from "../typedModel/customTypes";
import TypedJob from "./TypedJob";

const discordSyncRole = new TypedJob("discord.syncRole", {
  args: z.object({
    huntId: foreignKey,
    userIds: foreignKey.array(),
    force: z.boolean(),
  }),
  maxAttempts: 3,
});

export default discordSyncRole;
