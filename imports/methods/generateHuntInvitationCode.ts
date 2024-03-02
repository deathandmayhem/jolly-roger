import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ huntId: string }, string>(
  "Hunts.methods.generateHuntInvitationCode",
);
