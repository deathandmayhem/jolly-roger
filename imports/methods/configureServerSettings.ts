import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ defaultHuntTags: string | undefined }, void>(
  "Setup.methods.configureServerSettings",
);
