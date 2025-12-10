import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import Settings from "../lib/models/Settings";

export default async function getS3UploadParams(key: string, mimeType: string) {
  const s3BucketSettings = await Settings.findOneAsync({
    name: "s3.image_bucket",
  });
  if (!s3BucketSettings?.value) {
    // S3 image uploads are not configured
    return undefined;
  }

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
}
