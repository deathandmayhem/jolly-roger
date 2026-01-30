import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";

import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayConfigureAWS } from "../../lib/permission_stubs";
import Logger from "../../Logger";
import configureListS3Buckets from "../../methods/configureListS3Buckets";
import defineMethod from "./defineMethod";

defineMethod(configureListS3Buckets, {
  async run() {
    check(this.userId, String);

    if (!userMayConfigureAWS(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure S3 settings");
    }

    try {
      const s3 = new S3Client();
      const buckets = await s3.send(new ListBucketsCommand({}));
      return buckets.Buckets?.map((b) => b.Name) ?? [];
    } catch (e) {
      // This probably means something is wrong with our AWS credentials
      Logger.warn("Unable to list S3 buckets", { error: e });
      return [];
    }
  },
});
