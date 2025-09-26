import TypedMethod from "./TypedMethod";

// Returns a list of valid login methods for the specified user
export default new TypedMethod<
  { email: string; invitationCode: string },
  { exists: boolean; loginMethods?: string[] }
>("Users.methods.loginOptions");
