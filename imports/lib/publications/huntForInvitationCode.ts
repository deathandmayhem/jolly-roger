import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ invitationCode: string }>(
  "Hunts.publications.forInvitationCode",
);
