export function getCustomAvatarUrl(
  urlPrefix: string | undefined,
  userId: string | undefined,
  customAvatar: string | undefined,
): string | undefined {
  if (!urlPrefix || !userId || !customAvatar) {
    return undefined;
  }
  return `${urlPrefix}/users/${userId}/${customAvatar}`;
}

export class InvalidAvatarError extends Error {}

export async function processAvatarFile(file: File): Promise<Uint8Array> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new InvalidAvatarError("Please select an image file.");
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () =>
        reject(
          new InvalidAvatarError(
            "This image format is not supported by your browser.",
          ),
        ),
      );
      image.src = url;
    });

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new InvalidAvatarError(
        "Image dimensions must be greater than zero.",
      );
    }

    const cropSize = Math.min(img.naturalWidth, img.naturalHeight);
    const cropX = (img.naturalWidth - cropSize) / 2;
    const cropY = (img.naturalHeight - cropSize) / 2;

    const targetSize = Math.min(cropSize, 512);

    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new InvalidAvatarError("Failed to get canvas 2D context.");
    }

    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      targetSize,
      targetSize,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new InvalidAvatarError("Failed to encode image to PNG."));
        }
      }, "image/png");
    });

    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } finally {
    URL.revokeObjectURL(url);
  }
}
