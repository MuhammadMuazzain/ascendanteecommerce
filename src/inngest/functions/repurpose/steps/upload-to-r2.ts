import { NonRetriableError } from "inngest";
import { R2StorageService } from "@/lib/r2-storage";
import { config as appConfig } from "@/app/api/uploads/socials/config";

export interface UploadToR2Options {
  url: string;
  videoId: string;
}

export interface UploadToR2Result {
  r2Url: string;
  videoId: string;
}

/**
 * Downloads the source video and uploads it to R2, returning the public CDN URL.
 */
export async function uploadOriginalVideoToR2({
  url,
  videoId,
}: UploadToR2Options): Promise<UploadToR2Result> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new NonRetriableError(`Failed to download video from origin: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const r2Service = new R2StorageService({
    ...appConfig.r2,
    bucketName: appConfig.r2.bucket,
  });

  const r2FileName = `viral_edits/${videoId}_${Date.now()}.mp4`;
  const r2Url = await r2Service.uploadData(r2FileName, buffer, "video/mp4");

  return { r2Url, videoId };
}
