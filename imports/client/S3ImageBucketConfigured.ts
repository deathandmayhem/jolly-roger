import { Mongo } from "meteor/mongo";

export interface S3ImageBucketConfiguredType {
  configured: boolean;
  urlPrefix?: string;
}

// Pseudo-collection used to track S3 image bucket configuration
const S3ImageBucketConfigured =
  new Mongo.Collection<S3ImageBucketConfiguredType>("s3ImageBucketConfigured");

export default S3ImageBucketConfigured;
