export function s3BucketUrl(region: string, bucketName: string): string {
  return `https://s3.${region}.amazonaws.com/${bucketName}`;
}

export function s3ObjectUrl(
  region: string,
  bucketName: string,
  key: string,
): string {
  return `${s3BucketUrl(region, bucketName)}/${key}`;
}

export function userAvatarKey(userId: string, filename: string): string {
  return `users/${userId}/${filename}`;
}
