import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import {
  GetBucketLocationCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userMayConfigureAWS } from "../../lib/permission_stubs";
import configureS3ImageBucket from "../../methods/configureS3ImageBucket";
import defineMethod from "./defineMethod";

defineMethod(configureS3ImageBucket, {
  validate(arg) {
    check(arg, {
      bucketName: Match.Optional(String),
    });
    return arg;
  },

  async run({ bucketName }) {
    check(this.userId, String);

    if (!userMayConfigureAWS(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure S3 settings");
    }

    if (!bucketName) {
      Logger.info("Clearing configured S3 image bucket");
      await Settings.removeAsync({ name: "s3.image_bucket" });
      return;
    }

    const s3 = new S3Client();

    let region;
    try {
      const response = await s3.send(
        new GetBucketLocationCommand({ Bucket: bucketName }),
      );
      // A null response means the bucket is in us-east-1
      region = response.LocationConstraint ?? "us-east-1";
    } catch (e) {
      Logger.warn("Error while fetching bucket location", { error: e });
      throw new Meteor.Error(
        400,
        "Unable to get bucket location. Are you sure you have access to this bucket?",
      );
    }

    // Attempt to write to the bucket to verify that we have write access
    const testData = Random.id();
    const regionalS3 = new S3Client({ region });
    try {
      await regionalS3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: "__test__",
          Body: testData,
        }),
      );
    } catch (e) {
      Logger.warn("Error while writing to bucket", { error: e });
      throw new Meteor.Error(
        400,
        "Unable to write to bucket. Are you sure you have write access to this bucket?",
      );
    }

    // Make sure we can fetch the object we just wrote publicly
    const url = `https://s3.${region}.amazonaws.com/${bucketName}/__test__`;
    let text;
    try {
      const response = await fetch(url);
      text = await response.text();
    } catch (e) {
      Logger.warn("Error while reading from bucket", { error: e });
      throw new Meteor.Error(
        400,
        "Unable to read from bucket. Are you sure you this bucket allows publicly accessible keys?",
      );
    }
    if (text !== testData) {
      Logger.warn("Error while reading from bucket: data did not match", {
        text,
        testData,
      });
      throw new Meteor.Error(
        400,
        "Unable to read from bucket. Are you sure you this bucket allows publicly accessible keys?",
      );
    }

    // If we got this far, we're good to go
    Logger.info("Setting configured S3 image bucket", { bucketName, region });
    await Settings.upsertAsync(
      { name: "s3.image_bucket" },
      {
        $set: {
          "value.bucketName": bucketName,
          "value.bucketRegion": region,
        },
      },
    );
  },
});
