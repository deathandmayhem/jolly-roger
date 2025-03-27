import { check, Match } from "meteor/check";
import Settings from "../../lib/models/Settings";
import isS3Configured from "../../methods/isS3Configured";
import defineMethod from "./defineMethod";

defineMethod(isS3Configured, {
  validate(arg) {
    check(arg, {
      dummy: Match.Optional(String),
    });
    return arg;
  },

  async run() {
    const s3BucketSettings = await Settings.findOneAsync({
      name: "s3.image_bucket",
    });
    return !!s3BucketSettings?.value;
  },
});

export default isS3Configured;
