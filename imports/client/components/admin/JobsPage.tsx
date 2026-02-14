import { useTracker } from "meteor/react-meteor-data";
import { useCallback, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import { useTranslation } from "react-i18next";
import type { JobType } from "../../../lib/models/Jobs";
import Jobs from "../../../lib/models/Jobs";
import jobsAll from "../../../lib/publications/jobsAll";
import cancelJob from "../../../methods/cancelJob";
import retryJob from "../../../methods/retryJob";
import { useBreadcrumb } from "../../hooks/breadcrumb";
import useTypedSubscribe from "../../hooks/useTypedSubscribe";
import Loading from "../Loading";
import RelativeTime from "../RelativeTime";
import jobRenderers, { DefaultJobDetails } from "./jobRenderers";

const statusVariant = (status: JobType["status"]) => {
  switch (status) {
    case "pending":
      return "warning";
    case "running":
      return "info";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "secondary";
  }
};

const JobActions = ({ job }: { job: JobType }) => {
  const [requestState, setRequestState] = useState<
    "idle" | "in-flight" | "error"
  >("idle");
  const [requestError, setRequestError] = useState<string | undefined>(
    undefined,
  );

  const disabled = requestState === "in-flight";

  const onRetry = useCallback(() => {
    void (async () => {
      setRequestState("in-flight");
      try {
        await retryJob.callPromise({ jobId: job._id });
        setRequestState("idle");
      } catch (e: unknown) {
        setRequestState("error");
        setRequestError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [job._id]);

  const onCancel = useCallback(() => {
    void (async () => {
      setRequestState("in-flight");
      try {
        await cancelJob.callPromise({ jobId: job._id });
        setRequestState("idle");
      } catch (e: unknown) {
        setRequestState("error");
        setRequestError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [job._id]);

  return (
    <>
      {requestState === "error" && (
        <Alert
          variant="danger"
          onClose={() => setRequestState("idle")}
          dismissible
        >
          {requestError}
        </Alert>
      )}
      {job.status === "failed" && (
        <Button
          variant="warning"
          size="sm"
          disabled={disabled}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
      {job.status === "pending" && (
        <Button
          variant="danger"
          size="sm"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </>
  );
};

const JobRow = ({ job }: { job: JobType }) => {
  const Renderer = jobRenderers[job.type] ?? DefaultJobDetails;

  return (
    <tr>
      <td>{job.type}</td>
      <td>
        <Badge bg={statusVariant(job.status)}>{job.status}</Badge>
      </td>
      <td>
        <RelativeTime date={job.createdAt} />
      </td>
      <td>
        {job.attempts}/{job.maxAttempts}
      </td>
      <td>
        <Renderer job={job} />
      </td>
      <td>
        <JobActions job={job} />
      </td>
    </tr>
  );
};

const JobsPage = () => {
  const { t } = useTranslation();
  useBreadcrumb({
    title: t("navigation.adminJobs", "Jobs"),
    path: "/admin/jobs",
  });

  const jobsLoading = useTypedSubscribe(jobsAll);
  const loading = jobsLoading();

  const jobs = useTracker(
    () => Jobs.find({}, { sort: { createdAt: -1 } }).fetch(),
    [],
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <Table hover>
        <thead>
          <tr>
            <th>{t("adminJobs.type", "Type")}</th>
            <th>{t("adminJobs.status", "Status")}</th>
            <th>{t("adminJobs.created", "Created")}</th>
            <th>{t("adminJobs.attempts", "Attempts")}</th>
            <th>{t("adminJobs.details", "Details")}</th>
            <th>{t("adminJobs.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobRow key={job._id} job={job} />
          ))}
        </tbody>
      </Table>
      {jobs.length === 0 && <p>{t("adminJobs.noJobs", "No jobs.")}</p>}
    </div>
  );
};

export default JobsPage;
