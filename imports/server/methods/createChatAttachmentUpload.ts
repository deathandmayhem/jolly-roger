import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import Settings from "../../lib/models/Settings";
import createChatAttachmentUpload from "../../methods/createChatAttachmentUpload";
import defineMethod from "./defineMethod";

defineMethod(createChatAttachmentUpload, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      filename: String,
      mimeType: String, // Consider adding validation for allowed mime types if needed
    });

    return arg;
  },

  async run({ puzzleId, filename, mimeType }) {
    check(this.userId, String);
    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user) {
      throw new Meteor.Error(401, "Must be logged in");
    }

    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, "Puzzle not found");
    }

    // Check if user is part of the hunt associated with the puzzle
    if (!user.hunts?.includes(puzzle.hunt)) {
      throw new Meteor.Error(
        403,
        "User is not a member of the hunt for this puzzle",
      );
    }

    const s3BucketSettings = await Settings.findOneAsync({
      name: "s3.image_bucket",
    });
    if (
      !s3BucketSettings?.value?.bucketName ||
      !s3BucketSettings?.value?.bucketRegion
    ) {
      // S3 image uploads are not configured or incomplete
      // Let client handle this gracefully, maybe by checking isS3Configured first
      // Throwing here ensures we don't proceed if config is bad server-side
      throw new Meteor.Error(
        500,
        "S3 image upload is not configured on the server",
      );
    }

    const key = `${puzzle.hunt}/${puzzleId}/chat/${Random.id()}-${filename}`;

    const s3 = new S3Client({ region: s3BucketSettings.value.bucketRegion });
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: s3BucketSettings.value.bucketName,
      Key: key,
      Fields: {
        "Content-Type": mimeType,
        "x-amz-storage-class": "INTELLIGENT_TIERING",
      },
      Conditions: [
        ["content-length-range", 1, 30 * 1024 * 1024], // 30MB limit
        ["starts-with", "$Content-Type", "image/"], // Only allow images
      ],
    });

    const publicUrl = `https://s3.${s3BucketSettings.value.bucketRegion}.amazonaws.com/${s3BucketSettings.value.bucketName}/${key}`;

    return { publicUrl, uploadUrl: url, fields };
  },
});
