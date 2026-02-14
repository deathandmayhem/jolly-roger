import type { ComponentType } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import discordSyncRoleJob from "../../../lib/jobs/discordSyncRole";
import purgeHuntJob from "../../../lib/jobs/purgeHunt";
import type { JobType } from "../../../lib/models/Jobs";

const PurgeHuntJobDetails = ({ job }: { job: JobType }) => {
  const { huntId } = purgeHuntJob.argsSchema.parse(job.args);
  const result = job.result
    ? purgeHuntJob.resultSchema.parse(job.result)
    : undefined;

  return (
    <div>
      <div>
        Hunt: <code>{huntId}</code>
      </div>
      {job.status === "running" && result?.itemsTotal ? (
        <div>
          <ProgressBar
            now={(result.itemsCompleted / result.itemsTotal) * 100}
            label={`${result.itemsCompleted}/${result.itemsTotal}`}
          />
          {result.currentItemTotal != null &&
            result.currentItemCompleted != null && (
              <small>
                Sub-item: {result.currentItemCompleted}/
                {result.currentItemTotal}
              </small>
            )}
        </div>
      ) : null}
    </div>
  );
};

const DiscordSyncRoleJobDetails = ({ job }: { job: JobType }) => {
  const { huntId, userIds } = discordSyncRoleJob.argsSchema.parse(job.args);

  return (
    <div>
      <div>
        Hunt: <code>{huntId}</code>
      </div>
      <div>Users: {userIds.length}</div>
    </div>
  );
};

const DefaultJobDetails = ({ job }: { job: JobType }) => {
  const hasArgs = Object.keys(job.args).length > 0;

  return (
    <div>
      {hasArgs && (
        <pre>
          <code>{JSON.stringify(job.args, null, 2)}</code>
        </pre>
      )}
      {job.status === "failed" && job.error && (
        <div className="text-danger">{job.error}</div>
      )}
      {job.status === "completed" && job.result && (
        <pre>
          <code>{JSON.stringify(job.result, null, 2)}</code>
        </pre>
      )}
    </div>
  );
};

const jobRenderers: Record<string, ComponentType<{ job: JobType }>> = {
  "hunt.purgeHunt": PurgeHuntJobDetails,
  "discord.syncRole": DiscordSyncRoleJobDetails,
};

export { DefaultJobDetails };
export default jobRenderers;
