import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import Documents from "../../lib/models/Documents";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import createDocumentImageUpload from "../../methods/createDocumentImageUpload";
import defineMethod from "./defineMethod";

defineMethod(createDocumentImageUpload, {
  validate(arg) {
    check(arg, {
      documentId: String,
      filename: String,
      mimeType: String,
    });

    return arg;
  },

  async run({ documentId, filename, mimeType }) {
    check(this.userId, String);
    const user = (await MeteorUsers.findOneAsync(this.userId))!;

    const document = await Documents.findOneAsync(documentId);
    if (!document) {
      throw new Meteor.Error(404, "Document not found");
    }

    if (!user.hunts?.includes(document.hunt)) {
      throw new Meteor.Error(403, "User is not a member of this hunt");
    }

    const s3BucketSettings = await Settings.findOneAsync({
      name: "s3.image_bucket",
    });
    if (!s3BucketSettings?.value) {
      // S3 image uploads are not configured
      return undefined;
    }

    const key = `${document.hunt}/${documentId}/${Random.id()}-${filename}`;

    const s3 = new S3Client({ region: s3BucketSettings.value.bucketRegion });
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: s3BucketSettings.value.bucketName,
      Key: key,
      Fields: {
        "Content-Type": mimeType,
      },
    });

    const publicUrl = `https://s3.${s3BucketSettings.value.bucketRegion}.amazonaws.com/${s3BucketSettings.value.bucketName}/${key}`;

    return { publicUrl, uploadUrl: url, fields };
  },
});
