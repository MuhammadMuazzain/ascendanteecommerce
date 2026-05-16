import { StepContext } from "./types";
import { Segment, PriceItem } from "@/inngest/utils/types";
import { ServicePricing } from "@/inngest/utils/pricing";
import { downloadVideo } from "@/inngest/functions/common/utils/common";
import { fixAndValidateMp4 } from "@/inngest/services/ffmpeg";
import { createStyledPrompt, injectStructuralConstraints } from "@/lib/prompts";
import { resolutionType, aspectRatioType } from "@/utils/enum";
import fs from "fs";

export const generateImage = async (
  context: StepContext,
  seg: Segment,
  isProduct: boolean = false,
  promptOverride?: string,
  shotType?:
    | "lifestyle"
    | "medical_cgi"
    | "metaphor"
    | "product"
    | "generic"
    | "b-roll"
    | "character-speaking",
  fallbackModel?: string,
): Promise<{ imageUrl: string; price: PriceItem }> => {
  if (!promptOverride) {
    throw new Error(`Prompt is required for image generation in segment ${seg.id}`);
  }

  const { scheme, services } = context;
  const imageUrls = isProduct && scheme.assets?.length ? scheme.assets.map((a: any) => a.url) : [];

  const styledPrompt = injectStructuralConstraints(promptOverride, {
    styleDescription: scheme.visuals.style,
    aspectRatio: scheme.aspectRatio as aspectRatioType,
    isProduct,
    shotType,
  });

  if (!isProduct) {
    const imageUrl = await services.imageGenerator.create({
      prompt: styledPrompt,
      aspectRatio: scheme.aspectRatio,
      model: fallbackModel,
    });
    return {
      imageUrl,
      price: {
        service: "Gemini-2.5",
        type: "text_to_image",
        price: ServicePricing.GENERATE_GEMINI_V2_IMAGE,
      },
    };
  }

  const imageUrl = await services.imageGenerator.create({
    prompt: styledPrompt,
    aspectRatio: scheme.aspectRatio,
    imageUrls,
    model: fallbackModel,
  });
  return {
    imageUrl,
    price: {
      service: "Gemini-2.5",
      type: "image_to_image",
      price: ServicePricing.GENERATE_GEMINI_V2_IMAGE,
    },
  };
};

const getVideoPricing = (
  resolution: resolutionType,
  attempt: number,
  duration: number,
): PriceItem => {
  const isHigh = resolution === resolutionType.High;
  const isRetry = attempt > 1;

  const service = !isRetry ? "PixeVerse" : isHigh ? "Hailuo" : "Wan_2.2";
  const type = isHigh ? "video_1080" : "video_720";

  const basePrice = !isRetry
    ? isHigh
      ? ServicePricing.GENERATE_VIDEO_HIGH
      : ServicePricing.GENERATE_VIDEO_LOW
    : isHigh
      ? ServicePricing.GENERATE_VIDEO_HIGH_V2
      : ServicePricing.GENERATE_VIDEO_LOW_V2;

  const price = service === "Hailuo" ? basePrice : basePrice * duration;
  return { service, type, price };
};

export const generateVideoClip = async (
  context: StepContext,
  params: {
    seg: Segment;
    imageUrl: string | undefined;
    duration: number;
    tmpDir: string;
    promptOverride?: string;
    isProduct?: boolean;
    fallbackModel?: string;
  },
): Promise<{ videoPath: string; price: PriceItem; duration: number }> => {
  if (!params.promptOverride) {
    throw new Error(`Prompt is required for video generation in segment ${params.seg.id}`);
  }

  const { scheme, attempt, services } = context;
  const { resolution } = scheme;

  const snappedDuration = params.duration <= 4 ? 4 : params.duration <= 6 ? 6 : 8;

  const payload = {
    prompt: params.promptOverride,
    style: scheme.visuals.style,
    firstFrameUrl: params.imageUrl,
    durationSeconds: snappedDuration,
    aspectRatio: scheme.aspectRatio,
    model: params.fallbackModel,
  };

  let videoUrl = "";
  let actualDurationSeconds: number = snappedDuration;

  const result = await services.videoGenerator.create(payload);
  if (typeof result === "string") {
    videoUrl = result;
  } else {
    videoUrl = result.url;
    actualDurationSeconds = result.duration;
  }

  let videoPath: string | undefined;
  const MAX_RETRIES = 3;

  for (let attemptCount = 1; attemptCount <= MAX_RETRIES; attemptCount++) {
    try {
      let tempPath = await downloadVideo(videoUrl, params.tmpDir);
      tempPath = await fixAndValidateMp4(tempPath);
      if (!tempPath || !fs.existsSync(tempPath)) throw new Error(`Invalid video file: ${tempPath}`);
      videoPath = tempPath;
      break;
    } catch (err) {
      if (attemptCount === MAX_RETRIES)
        throw new Error(`Video generation failed after ${MAX_RETRIES} attempts.`);
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  if (!videoPath) throw new Error("Video file not found after retries.");

  const pricingEntry = !params.isProduct
    ? getVideoPricing(resolution, attempt, params.duration)
    : { service: "Veo-3.1", type: "video ad", price: ServicePricing.GENERATE_VEO_3_1_VIDEO };

  return { videoPath, price: pricingEntry, duration: actualDurationSeconds * 1000 };
};
