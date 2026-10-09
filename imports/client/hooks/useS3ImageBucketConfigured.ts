import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import S3ImageBucketConfigured from "../S3ImageBucketConfigured";

const useS3ImageBucketConfigured = () => {
  useSubscribe("s3ImageBucketConfigured");
  return useTracker(() => {
    const config = S3ImageBucketConfigured.findOne("s3ImageBucketConfigured");
    return {
      configured: config?.configured ?? false,
      urlPrefix: config?.urlPrefix,
    };
  }, []);
};

export default useS3ImageBucketConfigured;
