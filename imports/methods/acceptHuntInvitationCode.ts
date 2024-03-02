import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ invitationCode: string }, string>(
  "Hunts.methods.acceptHuntInvitationCode",
);
