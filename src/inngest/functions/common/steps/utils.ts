import { SegmentAsset } from "@/inngest/utils/types";
import { db } from "@/lib/database";
import { AssetType, AudioSubtype, SourceType } from "@/lib/database/types";
import { withDbRetry } from "@/lib/database/retry";
import { generateId } from "@/utils/id";

export const persistAsset = async (
  userId: string | null,
  projectId: string | null,
  schemeId: string,
  filePath: string,
  publicUrl: string,
  params: {
    sourceType: SourceType;
    assetType: AssetType;
    audioSubtype?: AudioSubtype;
    originalFilename?: string;
    duration?: number;
  },
) => {
  if (!userId) return;

  try {
    const uniqueFilename = filePath;

    await withDbRetry(() =>
      db
        .insertInto("assets")
        .values({
          id: generateId(),
          user_id: userId,
          project_id: projectId,
          source_type: params.sourceType,
          asset_type: params.assetType,
          audio_subtype: params.audioSubtype || null,
          original_filename: params.originalFilename || filePath.split("/").pop() || "asset",
          unique_filename: uniqueFilename,
          file_path: filePath,
          public_url: publicUrl,
          file_size: null,
          mime_type: null,
          duration: params.duration || null,
          metadata: { generation_id: schemeId },
        })
        .execute(),
    );
  } catch (err) {
    console.error("Failed to persist asset:", err);
  }
};

export const trackAsset = async (
  segmentId: string,
  assetId: string,
  data: {
    type?: "image" | "video" | "audio" | "transcript";
    url?: string;
    status?: "generating" | "completed" | "failed";
    active?: boolean;
    prompt?: string;
  },
) => {
  const segmentAssets: Record<string, SegmentAsset[]> = {};

  if (!segmentAssets[segmentId]) segmentAssets[segmentId] = [];

  const assets = segmentAssets[segmentId];
  const existingIndex = assets.findIndex((a) => a.id === assetId);

  if (existingIndex !== -1) {
    assets[existingIndex] = {
      ...assets[existingIndex],
      ...data,
    };
  } else {
    assets.push({
      id: assetId,
      type: data.type || "video",
      url: data.url || "",
      status: data.status || "generating",
      active: data.active ?? true,
      prompt: data.prompt || "",
    });
  }
};
