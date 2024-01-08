import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ huntId: string }>(
  "Hunts.publications.forHuntApp",
);
