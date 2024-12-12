import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ hunt: string; type: string; status: string; puzzle?: string; }, void>(
  "UserStatus.methods.setStatus",
);
