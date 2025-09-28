import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { invitationCode: string; email?: string },
  string
>("Hunts.methods.acceptHuntInvitationCode");
