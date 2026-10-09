import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Logger from "../../Logger";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import { userAvatarKey } from "../../lib/s3";
import removeCustomAvatar from "../../methods/removeCustomAvatar";
import defineMethod from "./defineMethod";

defineMethod(removeCustomAvatar, {
  async run() {
    check(this.userId, String);

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user) {
      throw new Meteor.Error(404, "User not found");
    }

    const oldAvatar = user.customAvatar;
    if (!oldAvatar) {
      return;
    }

    await MeteorUsers.updateAsync(this.userId, {
      $unset: { customAvatar: 1 },
    });

    const s3BucketSettings = await Settings.findOneAsync({
      name: "s3.image_bucket",
    });
    if (s3BucketSettings?.value) {
      try {
        const s3 = new S3Client({
          region: s3BucketSettings.value.bucketRegion,
        });
        await s3.send(
          new DeleteObjectCommand({
            Bucket: s3BucketSettings.value.bucketName,
            Key: userAvatarKey(this.userId, oldAvatar),
          }),
        );
      } catch (err) {
        Logger.warn("Failed to delete avatar from S3", {
          error: err,
          userId: this.userId,
          oldAvatar,
        });
      }
    }
  },
});
