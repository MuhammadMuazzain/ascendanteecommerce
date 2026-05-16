// https://deepgram.com/pricing?utm_keyword=deepgram%20pricing&utm_device=c&utm_campaign=Search_ACQ_STT_Brand_Test&utm_source=google&utm_medium=ppc&utm_term=deepgram%20pricing&hsa_acc=6090588941&hsa_cam=21955162034&hsa_grp=170567643065&hsa_ad=723149314290&hsa_src=g&hsa_tgt=kwd-1211190767222&hsa_kw=deepgram%20pricing&hsa_mt=e&hsa_net=adwords&hsa_ver=3&gad_source=1&gad_campaignid=21955162034&gbraid=0AAAAADE3JNSg9jrmTkysAy9CWv_GtIN17&gclid=CjwKCAiAzrbIBhA3EiwAUBaUdYpN_yDGxLGJYKCdXQ8ImtFwD0WM4bpbn1jvT4j2BgU5mcSbUg2q1BoCB0kQAvD_BwE
// https://elevenlabs.io/pricing?utm_source=google&utm_medium=cpc&utm_campaign=spain_brandsearch_brand_english&utm_id=22349494937&utm_term=elevenlabs%20studio&utm_content=brand_-_brand_studio&gad_source=1&gad_campaignid=22349494937&gbraid=0AAAAAp9ksTF8JR3PjfimunfLOG7RjuPuZ&gclid=CjwKCAiAzrbIBhA3EiwAUBaUdUkPucm0VSk-ona2jjcY48dlOBIjum2DpxmiJMRbBo7P4MmWJ_7h9BoCTXcQAvD_BwE
// https://www.freepik.com/api/pricing
// https://ai.google.dev/gemini-api/docs/pricing#gemini-3-pro-image-preview
// https://www.pexels.com/license/
import { GeminiModel } from "@/lib/gemini/types";

import { GenerateContentResponseUsageMetadata, MediaModality } from "@google/genai";

export enum ServicePricing {
  // Dollars
  SPEECH_TO_TEXT = 0.000154, // PER_SECONDS - DEEPGRAM

  TEXT_TO_SPEECH = 0.0002, // PER_CHARACTER - ELEVENLABS

  STOCK_VIDEOS = 0.0, // PER_USE - PEXELS

  GENERATE_SEEDREAM_IMAGE = 0.031, // 0.027 EUR_PER_USE - SEEDREAM V4
  GENERATE_SEEDREAM_45_IMAGE = 0.031, // SEEDREAM V4.5
  //GENERATE_IMAGE = 0.05, // PER_USE - GEMINI 2.5 IMAGE
  GENERATE_GEMINI_V3_IMAGE = 0.1344, // PER_USE - GEMINI 3 IMAGE
  GENERATE_GEMINI_V2_IMAGE = 0.04, // PER_USE - GEMINI 2 IMAGE TO IMAGE

  FLUX_EXPAND_IMAGE = 0.08274, // PER_USE - FLUX PRO IMAGE EXPAND

  GENERATE_VIDEO_LOW = 0.042, // 0.036 EUR/second - PIXVERSE_720
  GENERATE_VIDEO_HIGH = 0.083, // 0.072 EUR/second - PIXVERSE_1080

  GENERATE_VIDEO_LOW_V2 = 0.06, // 0.052 EUR/second - WAN_720
  GENERATE_VIDEO_HIGH_V2 = 0.45, // 0.39 EUR/video(6s) - HAILUO_1080

  GENERATE_VEO_3_1_VIDEO = 0.015, // PER_USE WITH AUDIO - VEO 3.1

  GENERATE_RUNWAYML_VIDEO = 0.06, // PER_USE - RUNWAYML

  SET_LIP_SYNC = 0.0236, // PER_SECONDS - FREEPIK
}

export function calculateGeminiCost(
  usage: GenerateContentResponseUsageMetadata,
  model: GeminiModel,
): number {
  let inputPricePer1M = 0;
  let outputPricePer1M = 0;

  const isLargeContext = (usage?.promptTokenCount || 0) > 200000;

  switch (model) {
    case "gemini-3-pro-preview":
      // Pro 3: $2.00 <= 200k, $4.00 > 200k
      inputPricePer1M = isLargeContext ? 4.0 : 2.0;
      outputPricePer1M = isLargeContext ? 18.0 : 12.0;
      break;

    case "gemini-2.5-flash-image":
      // Flash 3: $0.50 input (except audio), $3.00 output
      // Note: If audio is present, the calculation is mixed,
      inputPricePer1M = 0.5;
      outputPricePer1M = 3.0;
      break;

    case "gemini-2.5-pro":
      // Pro 2.5: $1.25 <= 200k, $2.50 > 200k
      inputPricePer1M = isLargeContext ? 2.5 : 1.25;
      outputPricePer1M = isLargeContext ? 15.0 : 10.0;
      break;

    default:
      inputPricePer1M = 0.3;
      outputPricePer1M = 2.5;
      break;
  }

  // INPUT COST CALCULATION
  // If the model is Flash and includes audio, audio tokens have different pricing ($1.00)
  let inputCost = 0;
  if (model.includes("flash")) {
    const audioTokens =
      usage.promptTokensDetails?.find((d) => d.modality === MediaModality.AUDIO)?.tokenCount || 0;
    const otherTokens = (usage.promptTokenCount || 0) - audioTokens;
    const audioPrice = model === "gemini-2.5-flash-image" ? 1.0 : 1.0; // Ambos $1.00 para audio
    inputCost =
      (otherTokens / 1_000_000) * inputPricePer1M + (audioTokens / 1_000_000) * audioPrice;
  } else {
    inputCost = ((usage.promptTokenCount || 0) / 1_000_000) * inputPricePer1M;
  }

  // OUTPUT COST CALCULATION (always includes thinking tokens)
  const totalOutputTokens = (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0);
  const outputCost = (totalOutputTokens / 1_000_000) * outputPricePer1M;

  return Number((inputCost + outputCost).toFixed(6));
}
