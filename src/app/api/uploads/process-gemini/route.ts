import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { GeminiService } from "@/lib/gemini/copilot";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  try {
    const { assetId } = await request.json();

    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    // Get asset from database
    const asset = await db
      .selectFrom("assets")
      .selectAll()
      .where("id", "=", assetId)
      .executeTakeFirst();

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Only process video assets
    if (asset.asset_type !== "video") {
      return NextResponse.json({ error: "Only video assets can be processed" }, { status: 400 });
    }

    // Skip if already uploaded to Gemini
    if (asset.gemini_file_uri) {
      return NextResponse.json({
        success: true,
        message: "Video already uploaded to Gemini",
        gemini_file_uri: asset.gemini_file_uri,
      });
    }

    console.log(`[Gemini Upload] Starting upload for asset ${assetId}`);

    // Download video to temporary file
    const response = await fetch(asset.public_url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFilePath = join(tmpdir(), `${assetId}.mp4`);
    await writeFile(tempFilePath, buffer);

    console.log(`[Gemini Upload] Downloaded video to ${tempFilePath}`);

    try {
      // Upload to Gemini
      const { fileUri, name, duration } = await GeminiService.uploadFile(
        tempFilePath,
        asset.mime_type || "video/mp4",
      );

      console.log(`[Gemini Upload] Uploaded to Gemini: ${fileUri}`);

      // Update asset with Gemini file URI
      await db
        .updateTable("assets")
        .set({
          gemini_file_uri: fileUri,
          duration: duration ? parseFloat(duration) : asset.duration,
        })
        .where("id", "=", assetId)
        .execute();

      console.log(`[Gemini Upload] Updated asset ${assetId} with Gemini URI`);

      return NextResponse.json({
        success: true,
        gemini_file_uri: fileUri,
        gemini_name: name,
      });
    } finally {
      // Clean up temporary file
      await unlink(tempFilePath).catch((err) => console.error("Failed to delete temp file:", err));
    }
  } catch (error) {
    console.error("[Gemini Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process video for Gemini",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
