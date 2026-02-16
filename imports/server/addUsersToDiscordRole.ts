import discordSyncRole from "../lib/jobs/discordSyncRole";
import enqueueJob from "./jobs/framework/enqueueJob";

export default async (
  userIds: string[],
  huntId: string,
  { force = true }: { force?: boolean } = {},
) => {
  await enqueueJob(discordSyncRole, { huntId, userIds, force });
};
