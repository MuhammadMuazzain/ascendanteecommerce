import { R2StorageService } from "./r2-storage";
import { config } from "@/inngest/config";

export interface UploadResult {
  fileName: string;
  filePath: string;
  contentType: string;
  presignedUrl: string;
  url: string;
}

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

export const uploadBase64ToR2 = async (
  base64Data: string,
  fileName: string,
  contentType: string = "image/png",
): Promise<string> => {
  // Strip off the data URL prefix if present
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Content, "base64");
  return r2.uploadData(fileName, buffer, contentType);
};

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export const uploadFile = async (file: File, userId?: string): Promise<UploadResult> => {
  // Upload via Next.js API to avoid browser CORS blocking direct PUT to R2
  const formData = new FormData();
  formData.append("file", file);
  if (userId) {
    formData.append("userId", userId);
  }

  const response = await fetch("/api/uploads/direct", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    details?: string;
    uploads?: UploadResult[];
  };

  if (!response.ok) {
    const detail =
      payload.details ||
      payload.error ||
      (response.status === 401
        ? "Sign in required to upload files."
        : response.status === 503
          ? "File storage is not configured on this server."
          : `Upload failed (${response.status})`);
    throw new UploadError(detail, response.status);
  }

  const uploadConfig = payload.uploads?.[0];
  if (!uploadConfig?.url) {
    throw new UploadError("Upload succeeded but no file URL was returned.");
  }

  return {
    fileName: uploadConfig.fileName,
    filePath: uploadConfig.filePath,
    contentType: uploadConfig.contentType,
    presignedUrl: uploadConfig.url,
    url: uploadConfig.url,
  };
};
