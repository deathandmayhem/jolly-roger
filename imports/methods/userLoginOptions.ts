import TypedMethod from "./TypedMethod";

export type UserLoginOptionsResult = {
  exists: boolean;
  loginMethods?: string[];
};

export default new TypedMethod<
  { email: string; invitationCode: string },
  UserLoginOptionsResult
>("Users.methods.loginOptions");
