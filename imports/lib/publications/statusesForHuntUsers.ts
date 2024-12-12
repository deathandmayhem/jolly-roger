import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ huntId: string }>(
  "UserStatuses.publications.forHunt",
);
