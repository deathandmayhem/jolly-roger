import TypedMethod from "./TypedMethod";

export default new TypedMethod<
  { clientId?: string; clientSecret?: string },
  void
>("Setup.methods.configureDiscordOAuthClient");
