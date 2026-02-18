import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ jobId: string }>(
  "Jobs.publications.forMerge",
);
