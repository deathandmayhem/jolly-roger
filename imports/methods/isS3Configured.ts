import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ dummy?: string }, boolean>(
  "Settings.methods.checkS3",
);
