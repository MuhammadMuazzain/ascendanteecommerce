import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { R2StorageService } from "@/lib/r2-storage";
import { config } from "@/inngest/config";

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

function getR2ConfigError(): string | null {
  const missing: string[] = [];
  if (!process.env.R2_BUCKET_NAME?.trim()) missing.push("R2_BUCKET_NAME");
  if (!process.env.R2_ACCESS_KEY_ID?.trim()) missing.push("R2_ACCESS_KEY_ID");
  if (!process.env.R2_SECRET_ACCESS_KEY?.trim()) missing.push("R2_SECRET_ACCESS_KEY");
  if (!process.env.R2_ACCOUNT_ID?.trim()) missing.push("R2_ACCOUNT_ID");
  if (!process.env.R2_PUBLIC_DOMAIN?.trim()) missing.push("R2_PUBLIC_DOMAIN");
  if (missing.length === 0) return null;
  return `Missing R2 env: ${missing.join(", ")}`;
}

export async function POST(request: NextRequest) {
  const configError = getR2ConfigError();
  if (configError) {
    console.error("[uploads/direct]", configError);
    return NextResponse.json(
      {
        error: "File storage is not configured",
        details: configError,
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const effectiveUserId =
      typeof userId === "string" && userId.trim() ? userId.trim() : "anonymous";
    const originalName = "name" in file && file.name ? file.name : "upload";
    const cleanName = originalName.trim().replace(/\s+/g, "-");
    const uniqueName = `${effectiveUserId}/${randomUUID()}-${cleanName}`;
    const contentType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await r2.uploadData(uniqueName, buffer, contentType);

    return NextResponse.json({
      success: true,
      uploads: [
        {
          fileName: cleanName,
          originalFilename: cleanName,
          uniqueFilename: uniqueName,
          filePath: uniqueName,
          contentType,
          url,
        },
      ],
    });
  } catch (error) {
    console.error("Error in direct upload route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
