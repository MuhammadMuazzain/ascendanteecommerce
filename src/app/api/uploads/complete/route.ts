import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { assetQueries } from "@/lib/database/asset-queries";
import { randomUUID } from "crypto";

interface CompleteUploadRequest {
  projectId?: string;
  sourceType: "user_uploaded" | "ai_generated";
  assetType: "image" | "video" | "audio";
  audioSubtype?: "music" | "sound_effect" | "voiceover";
  originalFilename: string;
  uniqueFilename: string;
  filePath: string;
  publicUrl: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  metadata?: any;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CompleteUploadRequest = await request.json();

    // Validate required fields
    if (
      !body.sourceType ||
      !body.assetType ||
      !body.originalFilename ||
      !body.uniqueFilename ||
      !body.filePath ||
      !body.publicUrl
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate sourceType
    if (!["user_uploaded", "ai_generated"].includes(body.sourceType)) {
      return NextResponse.json(
        { error: "Invalid sourceType. Must be user_uploaded or ai_generated" },
        { status: 400 },
      );
    }

    // Validate assetType
    if (!["image", "video", "audio"].includes(body.assetType)) {
      return NextResponse.json(
        { error: "Invalid assetType. Must be image, video, or audio" },
        { status: 400 },
      );
    }

    // Validate audioSubtype if provided
    if (body.audioSubtype && !["music", "sound_effect", "voiceover"].includes(body.audioSubtype)) {
      return NextResponse.json(
        {
          error: "Invalid audioSubtype. Must be music, sound_effect, or voiceover",
        },
        { status: 400 },
      );
    }

    // Create asset record
    const asset = await assetQueries.create({
      id: randomUUID(),
      user_id: userId,
      project_id: body.projectId || null,
      source_type: body.sourceType,
      asset_type: body.assetType,
      audio_subtype: body.audioSubtype || null,
      original_filename: body.originalFilename,
      unique_filename: body.uniqueFilename,
      file_path: body.filePath,
      public_url: body.publicUrl,
      file_size: body.fileSize || null,
      mime_type: body.mimeType || null,
      duration: body.duration || null,
      width: body.width || null,
      height: body.height || null,
      fps: body.fps || null,
      metadata: body.metadata || null,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      {
        error: "Failed to complete upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
