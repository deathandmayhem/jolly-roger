import TypedMethod from "./TypedMethod";

export default new TypedMethod<{ bucketName: string | undefined }, void>(
  "Setup.methods.configureS3ImageBucket",
);
