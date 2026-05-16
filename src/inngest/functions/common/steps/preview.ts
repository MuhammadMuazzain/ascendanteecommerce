import { db } from "@/lib/database";
import { projectQueries } from "@/lib/database/project-queries";
import { createStyledPrompt, buildPreviewPrompt } from "@/lib/prompts";
import { generateId } from "@/utils/id";
import { aspectRatioType, ResolverStatus } from "@/utils/enum";
import { PriceItem, SegmentAsset } from "@/inngest/utils/types";
import { ServicePricing } from "@/inngest/utils/pricing";
import { fileUrlToBuffer } from "@/inngest/functions/common/utils/common";
import { StepContext } from "./types";
import { persistAsset } from "@/inngest/functions/common/steps/utils";

export const generatePreviewImage = async (
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{ url: string; price: PriceItem[]; segmentAssets: Record<string, SegmentAsset[]> }> => {
  const { services, schemeId, scheme } = context;
  const config = scheme;

  const title = scheme.title || "";
  const promptPreview = scheme.promptPreview || "";

  const aspectSizes: Record<aspectRatioType, { width: number; height: number }> = {
    [aspectRatioType.SIXTEEN_NINE]: { width: 400, height: 225 },
    [aspectRatioType.NINE_SIXTEEN]: { width: 225, height: 400 },
    [aspectRatioType.ONE]: { width: 400, height: 400 },
  };
  const size = aspectSizes[config.aspectRatio as aspectRatioType];

  const previewPrompt = buildPreviewPrompt(
    title,
    promptPreview,
    config.visuals.style,
    config.aspectRatio,
  );

  const styledPrompt = createStyledPrompt(previewPrompt, {
    styleDescription: config.visuals.style,
  });

  let asset: SegmentAsset = {
    id: generateId(),
    type: "image",
    status: "generating",
    prompt: styledPrompt,
  };

  const img = await services.imageGenerator.create({
    prompt: styledPrompt,
    aspectRatio: config.aspectRatio,
    imageUrls: [],
    options: { webp: true, resize: size },
  });

  const { buffer, extension } = await fileUrlToBuffer(img);

  const filePath = `VIDEOS/${schemeId}/PREVIEW/${generateId()}.${extension}`;
  const url = await services.storage.uploadData(filePath, buffer);

  asset = { ...asset, url, status: "completed" };

  await persistAsset(userId, projectId, schemeId, filePath, url, {
    sourceType: "ai_generated",
    assetType: "image",
    originalFilename: `preview_${schemeId}.${extension}`,
  });

  // Update DB
  await db
    .updateTable("generations")
    .set({
      status: ResolverStatus.PROGRESS,
      progress: 1.5,
      preview_url: url,
    })
    .where("id", "=", schemeId)
    .execute();

  // Early update of project thumbnail
  try {
    const project = await projectQueries.findByGenerationId(schemeId);
    if (project) {
      await projectQueries.update(project.id, { thumbnail: url });
      console.log(`[EARLY UPDATE] Project ${project.id} thumbnail updated: ${url}`);
    }
  } catch (e) {
    console.warn("Failed to update project thumbnail early:", e);
  }

  const prices: PriceItem[] = [
    {
      service: "Gemini-3",
      type: "nano banana",
      price: ServicePricing.GENERATE_GEMINI_V3_IMAGE,
    },
  ];

  return { url, price: prices, segmentAssets: { [schemeId]: [asset] } };
};
