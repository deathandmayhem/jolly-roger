import crypto from "node:crypto";
import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userAvatarKey } from "../../lib/s3";
import uploadCustomAvatar from "../../methods/uploadCustomAvatar";
import defineMethod from "./defineMethod";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

defineMethod(uploadCustomAvatar, {
  validate(arg) {
    check(arg, {
      data: Match.Where(
        (x: unknown): x is Uint8Array => x instanceof Uint8Array,
      ),
      mimeType: String,
    });

    return arg;
  },

  async run({ data, mimeType }) {
    check(this.userId, String);

    const s3BucketSettings = await Settings.findOneAsync({
      name: "s3.image_bucket",
    });
    if (!s3BucketSettings?.value) {
      throw new Meteor.Error(400, "S3 image bucket is not configured");
    }

    if (mimeType !== "image/png") {
      throw new Meteor.Error(400, "Only PNG images are supported for avatars");
    }

    if (data.length > MAX_AVATAR_SIZE) {
      throw new Meteor.Error(
        400,
        `Avatar file size must be less than ${MAX_AVATAR_SIZE / (1024 * 1024)}MB`,
      );
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user) {
      throw new Meteor.Error(404, "User not found");
    }

    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(data))
      .digest("hex");
    const filename = `${hash}.png`;
    const key = userAvatarKey(this.userId, filename);

    const s3 = new S3Client({ region: s3BucketSettings.value.bucketRegion });

    await s3.send(
      new PutObjectCommand({
        Bucket: s3BucketSettings.value.bucketName,
        Key: key,
        Body: Buffer.from(data),
        ContentType: "image/png",
      }),
    );

    const oldAvatar = user.customAvatar;
    await MeteorUsers.updateAsync(this.userId, {
      $set: { customAvatar: filename },
    });

    if (oldAvatar && oldAvatar !== filename) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: s3BucketSettings.value.bucketName,
            Key: userAvatarKey(this.userId, oldAvatar),
          }),
        );
      } catch (err) {
        Logger.warn("Failed to delete previous avatar from S3", {
          error: err,
          userId: this.userId,
          oldAvatar,
        });
      }
    }

    return { customAvatar: filename };
  },
});
