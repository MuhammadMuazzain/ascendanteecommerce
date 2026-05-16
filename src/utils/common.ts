import sharp from "sharp";

export async function cropImage(
  base64Data: string,
  size: { width: number; height: number },
  options?: { webp?: boolean; resize: { width?: number; height?: number } },
) {
  const buffer = Buffer.from(base64Data, "base64");
  let image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Cannot read image size.");
  }

  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const targetWidth = size.width;
  const targetHeight = size.height;

  const originalRatio = originalWidth / originalHeight;
  const targetRatio = targetWidth / targetHeight;

  let cropWidth = originalWidth;
  let cropHeight = originalHeight;

  if (Math.abs(originalRatio - targetRatio) < 0.001) {
    console.log("Aspect ratio already matches. No cropping.");
    return base64Data;
  }

  if (originalRatio > targetRatio) {
    // Wider image → crop on sides
    cropWidth = Math.round(originalHeight * targetRatio);
  } else {
    // Taller image → crop top and bottom
    cropHeight = Math.round(originalWidth / targetRatio);
  }

  // Adjust if image is smaller than target size
  cropWidth = Math.min(cropWidth, originalWidth);
  cropHeight = Math.min(cropHeight, originalHeight);

  const left = Math.round((originalWidth - cropWidth) / 2);
  const top = Math.round((originalHeight - cropHeight) / 2);

  image = image.extract({ left, top, width: cropWidth, height: cropHeight });

  if (options?.resize) {
    image = image.resize({
      width: options.resize?.width,
      height: options.resize?.height,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  if (options?.webp) {
    image = image.toFormat("webp");
  }

  const croppedBuffer = await image.toBuffer();

  const croppedBase64 = croppedBuffer.toString("base64");

  console.log(
    `✅ Centered cropped image. Original: ${originalWidth}x${originalHeight}, Crop: ${cropWidth}x${cropHeight}`,
  );

  return croppedBase64;
}

export function roundUp3(value: number): number {
  return Math.ceil(value * 1000) / 1000;
}

export function roundDown3(value: number): number {
  return Math.floor(value * 1000) / 1000;
}
