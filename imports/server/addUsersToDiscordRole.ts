import discordSyncRoleJob from "./jobs/discordSyncRole";

export default async (
  userIds: string[],
  huntId: string,
  { force = true }: { force?: boolean } = {},
) => {
  await discordSyncRoleJob.enqueue({ huntId, userIds, force });
};
