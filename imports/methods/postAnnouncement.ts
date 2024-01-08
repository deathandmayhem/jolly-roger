import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ huntId: string; message: string }, void>(
  "Announcements.methods.post",
);
