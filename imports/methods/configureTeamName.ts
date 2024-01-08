import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ teamName?: string }, void>(
  "Setup.methods.configureTeamName",
);
