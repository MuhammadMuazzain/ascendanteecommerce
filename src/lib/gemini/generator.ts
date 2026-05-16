import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";
import sharp from "sharp";

import { Schema, VisualShot, VisualBroll } from "../schema-generator/types";
import { BatchTimingResponse, GeminiModel, VisualPrompt } from "./types";
import { fileUrlToBuffer } from "@/utils/download";
import { calculateGeminiCost } from "@/inngest/utils/pricing";
import { PriceItem } from "@/inngest/utils/types";
import {
  VIDEO_ANALYSIS_PROMPT,
  AUDIO_RATING_PROMPT,
  VIDEO_SFX_ANALYSIS_PROMPT,
  SCHEMA_OUTPUT_INSTRUCTIONS,
} from "../prompts";
import {
  ASSISTANT_SCRIPT_SYSTEM_PROMPT,
  ASSISTANT_SCRIPT_OUTPUT_SCHEMA,
} from "../prompts/assistant-script";

export class GeminiService {
  public gemini: GoogleGenAI;
  private model: GeminiModel;

  constructor(apiKey: string, model: string) {
    this.model = model as GeminiModel;
    this.gemini = new GoogleGenAI({ apiKey });
  }

  async prepareImageForGemini(
    buffer: Buffer,
    contentType: string,
  ): Promise<{ data: string; mimeType: string }> {
    const supportedMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
      "image/heif",
    ];

    if (supportedMimeTypes.includes(contentType)) {
      return {
        data: buffer.toString("base64"),
        mimeType: contentType,
      };
    }

    try {
      console.log(`Converting ${contentType} to image/webp for Gemini compatibility...`);
      const convertedBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

      return {
        data: convertedBuffer.toString("base64"),
        mimeType: "image/webp",
      };
    } catch (err) {
      console.error(`Failed to convert image ${contentType}:`, err);
      // Fallback to original and let Gemini handle (or fail)
      return {
        data: buffer.toString("base64"),
        mimeType: contentType,
      };
    }
  }

  async analyzeReferenceVideo(videoUrl: string): Promise<{
    structure: string;
    pacing: { type: string; secondsPerImage: number; description: string };
    animationStyle: {
      type: string;
      details: string;
      typicalParams: Record<string, any>;
    };
    transitionStyle: { type: string; duration: number; description: string };
    captionStyle: string;
    visualStyle: {
      product: { aesthetic: string; lighting: string; description: string };
      general: { aesthetic: string; lighting: string; description: string };
    };
    editingNotes: string;
  }> {
    try {
      // Download video and convert to base64
      const { buffer, contentType } = await fileUrlToBuffer(videoUrl);
      const base64Video = buffer.toString("base64");

      const analysisPrompt = VIDEO_ANALYSIS_PROMPT;

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [
          { text: analysisPrompt },
          {
            inlineData: {
              mimeType: contentType,
              data: base64Video,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const analysisText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!analysisText) {
        throw new Error("Failed to generate video analysis");
      }

      // Parse the JSON response
      const analysis = JSON.parse(analysisText);

      return {
        structure: analysis.structure || "Analysis unavailable",
        pacing: analysis.pacing || {
          type: "Medium",
          secondsPerImage: 3,
          description: "Medium pacing",
        },
        animationStyle: analysis.animationStyle || {
          type: "None",
          details: "Static",
          typicalParams: {},
        },
        transitionStyle: analysis.transitionStyle || {
          type: "Hard Cut",
          duration: 0,
          description: "Standard cuts",
        },
        captionStyle: analysis.captionStyle || "None",
        visualStyle: analysis.visualStyle || {
          product: {
            aesthetic: "Standard",
            lighting: "Neutral",
            description: "Clean product shots",
          },
          general: {
            aesthetic: "Standard",
            lighting: "Neutral",
            description: "Standard b-roll",
          },
        },
        editingNotes: analysis.editingNotes || "None",
      };
    } catch (err: any) {
      console.error("Video analysis failed:", err);
      throw new Error(
        "Failed to analyze reference video. Please try again with a different video.",
      );
    }
  }

  async generateScriptAssistant(input: {
    message: string;
    imageUrls?: string[];
    schema?: any;
    productName?: string;
    productDescription?: string;
    systemPrompt?: string;
    /** Override the Gemini response schema (e.g. CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA) */
    outputSchema?: Record<string, any>;
  }): Promise<any> {
    try {
      let prompt = `USER REQUEST: ${input.message}`;

      if (input.imageUrls && input.imageUrls.length > 0) {
        prompt += `\n\n[PRODUCT IMAGE ANALYSIS]:
Analyze the uploaded product image to identify:
1. PRIMARY COLOR(S): The dominant colors of the product/packaging.
2. SECONDARY COLOR(S): Accents and branding highlights.
3. CORE THEME: What problem does this product solve?

Apply these rules for the Character-Driven Ad blocks:
- HERO: MUST match the product's primary and secondary colors exactly (e.g., if packaging is dark blue, the hero must be dark blue).
- VILLAINS: MUST represent the problem the product solves (e.g., "Brain Fog", "Fatigue"). Their colors should contrast the hero (murky, dark, or negative tones) and SHOULD NOT match the product colors.
- THEMATIC COHESION: Even with contrasting colors, villains should feel like they belong in a story about the product's benefits.`;
      }

      const contents: any[] = [
        { text: input.systemPrompt || ASSISTANT_SCRIPT_SYSTEM_PROMPT },
        { text: prompt },
      ];

      if (input.schema) {
        contents.push({ text: `CURRENT CONFIGURATION: ${JSON.stringify(input.schema)}` });
      }

      if (input.productName || input.productDescription) {
        contents.push({
          text: `PRODUCT INFO: Name: ${input.productName || ""}, Description: ${input.productDescription || ""}`,
        });
      }

      if (input.imageUrls && input.imageUrls.length > 0) {
        for (const url of input.imageUrls) {
          const { buffer, contentType } = await fileUrlToBuffer(url);
          const imageData = await this.prepareImageForGemini(buffer, contentType);
          contents.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          });
        }
      }

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: (input.outputSchema || ASSISTANT_SCRIPT_OUTPUT_SCHEMA) as any,
        },
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");

      return JSON.parse(text);
    } catch (err) {
      console.error("Error in generateScriptAssistant:", err);
      throw err;
    }
  }

  async analyzeVideoForSfx(
    videoBuffer: Buffer,
    contentType: string,
  ): Promise<{ effects: { prompt: string; start: number; end: number; volume?: number }[] }> {
    try {
      const base64Video = videoBuffer.toString("base64");

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [
          { text: VIDEO_SFX_ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType: contentType,
              data: base64Video,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const analysisText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const analysis = JSON.parse(analysisText);

      return {
        effects: analysis.effects || [],
      };
    } catch (err: any) {
      console.error("Video SFX analysis failed:", err);
      // Return empty effects list instead of failing the whole pipeline
      return { effects: [] };
    }
  }

  async generateProductImagePrompts(
    imageUrls: string[],
    prompt: string,
    schema?: Schema,
  ): Promise<{ prompts: VisualPrompt[]; price: PriceItem }> {
    try {
      const imagesData = await Promise.all(
        imageUrls.map(async (url) => {
          const { buffer, contentType } = await fileUrlToBuffer(url);
          const prepared = await this.prepareImageForGemini(buffer, contentType);
          return {
            inlineData: prepared,
          };
        }),
      );

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }, ...imagesData],
        config: {
          responseMimeType: "application/json",
        },
      });

      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const prompts = JSON.parse(text);

      return { prompts, price: { service: "Gemini", type: "Chat", price } };
    } catch (err: any) {
      console.error("Failed to generate schema prompts:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  async generateProductAdBrolls(
    schema: Schema,
    prompt: string,
    avatarUrl?: string,
  ): Promise<
    {
      segmentId: string;
      bRolls: {
        type: "video";
        firstFramePrompt: string;
        videoPrompt: string;
        scenePrompt: string;
        words: string;
      }[];
    }[]
  > {
    try {
      if (!schema || !schema.segments || schema.segments.length === 0) {
        throw new Error("Schema with segments is required");
      }

      let mediaData: any[] = [];

      // Add avatar image for consistency
      if (avatarUrl) {
        try {
          const { buffer, contentType } = await fileUrlToBuffer(avatarUrl);
          const prepared = await this.prepareImageForGemini(buffer, contentType);
          mediaData.push({
            inlineData: prepared,
          });
        } catch (e) {
          console.error("Failed to include avatar image in b-roll prompt generation:", e);
        }
      }

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }, ...mediaData],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const parsed = JSON.parse(text);

      // Force type to 'video' since this logic only generates talking head B-rolls
      if (Array.isArray(parsed)) {
        parsed.forEach((seg: any) => {
          if (Array.isArray(seg.bRolls)) {
            seg.bRolls.forEach((b: any) => {
              b.type = "video";
            });
          }
        });
      }

      return parsed;
    } catch (err: any) {
      console.error("Failed to generate Product Ad B-rolls:", err);
      return [];
    }
  }

  async generateUGCPrompts(
    schema: Schema,
    prompt: string,
    assets: { url: string; label?: string }[] = [],
    avatarUrl?: string,
  ): Promise<{ prompts: VisualPrompt[]; price: PriceItem }> {
    try {
      if (!schema || !schema.segments || schema.segments.length === 0) {
        throw new Error("Schema with segments is required");
      }

      let mediaData: any[] = [];

      // Add product images
      if (assets.length > 0) {
        const productMedia = await Promise.all(
          assets.slice(0, 4).map(async (asset) => {
            const { buffer, contentType } = await fileUrlToBuffer(asset.url);
            const prepared = await this.prepareImageForGemini(buffer, contentType);
            return {
              inlineData: prepared,
            };
          }),
        );
        mediaData.push(...productMedia);
      }

      // Add avatar image for consistency
      if (avatarUrl) {
        try {
          const { buffer, contentType } = await fileUrlToBuffer(avatarUrl);
          const prepared = await this.prepareImageForGemini(buffer, contentType);
          mediaData.push({
            inlineData: prepared,
          });
        } catch (e) {
          console.error("Failed to include avatar image in prompt generation:", e);
        }
      }

      const contents = [{ text: prompt }, ...mediaData];

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          responseMimeType: "application/json",
        },
      });

      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const prompts = JSON.parse(text);

      return { prompts, price: { service: "Gemini", type: "Chat", price } };
    } catch (err: any) {
      console.error("Failed to generate UGC shots:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  async generateUGCBrolls(
    schema: Schema,
    prompt: string,
    assets: { url: string; label?: string }[],
    avatarUrl?: string,
  ): Promise<{ segmentId: string; bRolls: VisualBroll[] }[]> {
    try {
      if (!schema || !schema.segments || schema.segments.length === 0) {
        throw new Error("Schema with segments is required");
      }

      let mediaData: any[] = [];
      if (assets.length > 0) {
        const productMedia = await Promise.all(
          assets.slice(0, 4).map(async (asset) => {
            const { buffer, contentType } = await fileUrlToBuffer(asset.url);
            const prepared = await this.prepareImageForGemini(buffer, contentType);
            return {
              inlineData: prepared,
            };
          }),
        );
        mediaData.push(...productMedia);
      }

      if (avatarUrl) {
        try {
          const { buffer, contentType } = await fileUrlToBuffer(avatarUrl);
          const prepared = await this.prepareImageForGemini(buffer, contentType);
          mediaData.push({
            inlineData: prepared,
          });
        } catch (e) {
          console.error("Failed to include avatar image in bRoll prompt generation:", e);
        }
      }

      const contents = [{ text: prompt }, ...mediaData];

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const parsed = JSON.parse(text);

      // Ensure defaults for displayMode
      if (Array.isArray(parsed)) {
        parsed.forEach((seg: any) => {
          if (Array.isArray(seg.bRolls)) {
            seg.bRolls.forEach((b: any) => {
              b.displayMode = b.displayMode || "cutaway";
            });
          }
        });
      }

      return parsed;
    } catch (err: any) {
      console.error("Failed to generate UGC b-rolls:", err);
      return [];
    }
  }

  async generateUGCUnifiedPrompts(
    schema: Schema,
    prompt: string,
    assets: { url: string; label?: string }[] = [],
    avatarUrl?: string,
  ): Promise<{
    prompts: {
      segmentId: string;
      shots: VisualShot[];
      bRolls: VisualBroll[];
    }[];
    price: PriceItem;
  }> {
    try {
      if (!schema || !schema.segments || schema.segments.length === 0) {
        throw new Error("Schema with segments is required");
      }

      let mediaData: any[] = [];

      // Add product images (limit to 4 for context window)
      if (assets.length > 0) {
        const productMedia = await Promise.all(
          assets.slice(0, 4).map(async (asset) => {
            const { buffer, contentType } = await fileUrlToBuffer(asset.url);
            const prepared = await this.prepareImageForGemini(buffer, contentType);
            return {
              inlineData: prepared,
            };
          }),
        );
        mediaData.push(...productMedia);
      }

      // Add avatar image for consistency
      if (avatarUrl) {
        try {
          const { buffer, contentType } = await fileUrlToBuffer(avatarUrl);
          const prepared = await this.prepareImageForGemini(buffer, contentType);
          mediaData.push({
            inlineData: prepared,
          });
        } catch (e) {
          console.error("Failed to include avatar image in unified prompt generation:", e);
        }
      }

      const contents = [{ text: prompt }, ...mediaData];

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          responseMimeType: "application/json",
        },
      });

      const part = response?.candidates?.[0]?.content?.parts?.[0];
      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = part?.text || "[]";
      const parsed = JSON.parse(text);

      // Ensure defaults for displayMode
      if (Array.isArray(parsed)) {
        parsed.forEach((seg: any) => {
          if (Array.isArray(seg.bRolls)) {
            seg.bRolls.forEach((br: any) => {
              if (!br.displayMode) br.displayMode = "overlay";
            });
          }
        });
      }

      return { prompts: parsed, price: { service: "Gemini", type: "Chat", price } };
    } catch (err: any) {
      console.error("Failed to generate Unified UGC prompts:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  async generateFakeUGCUnifiedPrompts(
    schema: Schema,
    prompt: string,
    assets: { url: string; label?: string }[],
  ): Promise<{
    prompts: {
      segmentId: string;
      shots: VisualShot[];
      bRolls: VisualBroll[];
    }[];
    price: PriceItem;
  }> {
    try {
      if (!schema || !schema.segments || schema.segments.length === 0) {
        throw new Error("Schema with segments is required");
      }

      let mediaData: any[] = [];

      // Add product images (limit to 6 for Fake UGC since they are the primary source)
      if (assets.length > 0) {
        const productMedia = await Promise.all(
          assets.slice(0, 6).map(async (asset) => {
            const { buffer, contentType } = await fileUrlToBuffer(asset.url);
            const prepared = await this.prepareImageForGemini(buffer, contentType);
            return {
              inlineData: prepared,
            };
          }),
        );
        mediaData.push(...productMedia);
      }

      const contents = [{ text: prompt }, ...mediaData];

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          responseMimeType: "application/json",
        },
      });

      const part = response?.candidates?.[0]?.content?.parts?.[0];
      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = part?.text || "[]";
      const parsed = JSON.parse(text);

      return {
        prompts: parsed,
        price: { service: "Gemini", type: "Chat", price },
      };
    } catch (err: any) {
      console.error("Error in generateFakeUGCUnifiedPrompts:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  /**
   * Generate schema prompts for generic videos (educational, motivational, etc.)
   * without product context. Focuses on thematic B-roll and conceptual imagery.
   */
  async generateStandardImagePrompts(
    prompt: string,
    schema?: Schema,
  ): Promise<{ prompts: VisualPrompt[]; price: PriceItem }> {
    try {
      console.log("prompt", prompt);

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const prompts = JSON.parse(text);

      return { prompts, price: { service: "Gemini", type: "Chat", price } };
    } catch (err: any) {
      console.error("Failed to generate generic schema prompts:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  /**
   * Generate video-specific prompts for generic topics (no product reference).
   * Returns prompts for: firstFrame, video, image.
   */
  async generateStandardVideoPrompts(
    prompt: string,
    schema?: Schema,
  ): Promise<{ prompts: VisualPrompt[]; price: PriceItem }> {
    try {
      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const prompts = JSON.parse(text);

      return { prompts, price: { service: "Gemini", type: "Chat", price } };
    } catch (err: any) {
      console.error("Failed to generate generic video prompts:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  /**
   * Generate video-specific prompts for PRODUCT videos.
   * Leverages reference images to maintain product consistency.
   */
  async generateProductVideoPrompts(
    imageUrls: string[],
    prompt: string,
    schema?: Schema,
  ): Promise<{ prompts: VisualPrompt[]; price: PriceItem }> {
    console.log("generateVideoPrompts");
    try {
      const imagesData = await Promise.all(
        imageUrls.map(async (url) => {
          const { buffer, contentType } = await fileUrlToBuffer(url);
          const prepared = await this.prepareImageForGemini(buffer, contentType);
          return {
            inlineData: prepared,
          };
        }),
      );

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }, ...imagesData],
        config: {
          responseMimeType: "application/json",
        },
      });

      const price = response.usageMetadata
        ? calculateGeminiCost(response.usageMetadata, this.model)
        : 0;

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const prompts = JSON.parse(text);

      return { prompts, price: { service: "Gemini", type: "Chat", price } };
    } catch (err: any) {
      console.error("Failed to generate video prompts:", err);
      return {
        prompts: [],
        price: { service: "Gemini", type: "Chat", price: 0 },
      };
    }
  }

  async rateAudioClarity(videoUrl: string): Promise<number> {
    try {
      const { buffer, contentType } = await fileUrlToBuffer(videoUrl);
      const base64Video = buffer.toString("base64");

      const ratingPrompt = AUDIO_RATING_PROMPT;

      const response = await this.gemini.models.generateContent({
        // Use gemini-2.5-flash-lite-lite for efficient audio analysis as requested
        model: "gemini-2.5-flash-lite",
        contents: [
          { text: ratingPrompt },
          {
            inlineData: {
              mimeType: contentType,
              data: base64Video,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const resultText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!resultText) return 0;

      const result = JSON.parse(resultText);
      return typeof result.score === "number" ? result.score : 0;
    } catch (err) {
      console.error("Audio clarity rating failed:", err);
      return 0;
    }
  }

  /**
   * Sends all candidate videos to Gemini in a single request so it can
   * comparatively select the best voice for cloning.
   *
   * @param candidates  Array of { index, url } objects — index is used as the
   *                    zero-based identifier in the prompt so Gemini can return it.
   * @returns           The zero-based index of the best candidate, or 0 on failure.
   */
  async selectBestVoiceFromVideos(candidates: { index: number; url: string }[]): Promise<number> {
    try {
      console.log(
        `[GeminiService] Comparing ${candidates.length} voice candidates in a single request...`,
      );

      // Download all videos in parallel
      const videoBuffers = await Promise.all(
        candidates.map(async (c) => {
          const { buffer, contentType } = await fileUrlToBuffer(c.url);
          return { index: c.index, base64: buffer.toString("base64"), contentType };
        }),
      );

      const selectionPrompt = `You are an expert audio analyst tasked with selecting the best voice clone source from a set of User Generated Content (UGC) videos.
You will be provided with ${candidates.length} video clips, labelled Video 0 through Video ${candidates.length - 1}.

Analyze each video and select the single BEST source highly authentic, conversational voice cloning. Prioritize a GENUINE, REAL-WORLD sound over sterilized studio perfection.

Strict Evaluation Criteria:
- Unpolished Authenticity (50%): Human-like prosody, engaging intonation, and casual cadence. Must sound like a genuine, relatable person talking directly to their phone. HEAVILY PENALIZE stiff, "announcer-like", or overly polished commercial reads.
- Natural Environmental Acoustics (30%): The audio should be perfectly clear, but it MUST sound like a real room (e.g., natural breathing, slight realistic room reverb) rather than a dead, clinical, isolated sound booth.
- Zero Digital Artifacts (20%): Immediate disqualification for any metallic "underwater" sounds, digital hissing, popping, or robotic AI stuttering.

Select the candidate that sounds the most natively human, relatable, and authentic, as if randomly recorded by a creator in their home.

Return ONLY a JSON object with exactly two fields:
{
  "bestIndex": <zero-based integer of the best video>,
  "reasoning": "<one brief sentence explaining specifically why this video has the best authentic/relatable UGC quality>"
}`;

      // Build the content parts: prompt text followed by all video inline data
      const contents: any[] = [{ text: selectionPrompt }];
      for (const v of videoBuffers) {
        contents.push({ text: `Video ${v.index}:` });
        contents.push({
          inlineData: { mimeType: v.contentType, data: v.base64 },
        });
      }

      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: { responseMimeType: "application/json" },
      });

      const resultText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!resultText) {
        console.warn("[GeminiService] Empty response from voice selection, defaulting to index 0");
        return 0;
      }

      const result = JSON.parse(resultText);
      console.log(
        `[GeminiService] Voice selection result: index=${result.bestIndex}, reason="${result.reasoning}"`,
      );

      return typeof result.bestIndex === "number" ? result.bestIndex : 0;
    } catch (err) {
      console.error("[GeminiService] Comparative voice selection failed:", err);
      return 0;
    }
  }

  /**
   * Analyze a raw product image and determine what components are actually visible.
   * Returns structured analysis with explicit flags for conditional render planning.
   */
  async analyzeProductComponents(imageUrl: string): Promise<{
    hasPackaging: boolean;
    hasInnerProduct: boolean;
    hasMultipleComponentsTogether: boolean;
    packageDescription: string;
    innerProductDescription: string;
    innerProductShape: string;
    brandColors: string;
    overallStyle: string;
    rendersToGenerate: {
      type: "package_hero" | "product_closeup" | "lifestyle_arrangement";
      reasoning: string;
      prompt: string;
    }[];
  }> {
    const { buffer, contentType } = await fileUrlToBuffer(imageUrl);
    const base64Image = buffer.toString("base64");

    const analysisPrompt = `You are a product imagery expert and AI image generation prompt engineer for a professional video ad studio.

Analyze this product image thoroughly and return ONLY a valid JSON object.

You will:
1. Identify what components are visually present
2. Decide what clean renders would be most useful for a video ad
3. Write ready-to-use, detailed prompts for an image generation model (Imagen/Gemini) for each render

JSON structure:
{
  "hasPackaging": true/false,
  "hasInnerProduct": true/false,
  "hasMultipleComponentsTogether": true/false,
  "packageDescription": "Full description of packaging: shape, material, colors, branding",
  "innerProductDescription": "Full description IF AND ONLY IF inner product is VISIBLY PRESENT. Include exact shape, color, texture, surface finish.",
  "innerProductShape": "Precise shape if inner product visible. Empty string if not visible.",
  "brandColors": "Primary color palette observed",
  "overallStyle": "Aesthetic: 'scientific/premium', 'natural/organic', 'clean/medical', 'vibrant/fun'",
  "rendersToGenerate": [
    {
      "type": "package_hero_clean",
      "reasoning": "brief reason",
      "prompt": "< WRITE A COMPLETE, DETAILED IMAGE GENERATION PROMPT HERE for a clean studio hero shot of ONLY the packaging on a pure white background >"
    }
  ]
}

RULES for rendersToGenerate (produce at most 2 renders per image — pick the most useful):
- Include "package_hero_clean" if packaging (external container) is visible.
- Include "product_closeup" ONLY if the INTERNAL inner product / content is actually VISIBLE in some way (e.g. bottle is open, isolated pill, visible through clear packaging).
- MAXIMUM 2 types per image ("package_hero_clean" and "product_closeup").
- STRICTLY FORBIDDEN: Do not "infer" or "make up" products that are not actually shown. If you can't see it (e.g. product is hidden inside a closed cardboard box), don't include it.
- STRICTLY FORBIDDEN: Do not generate hands, humans, or environmental backgrounds. White background ONLY.

CRITICAL prompt writing rules — REALISM IS PARAMOUNT for UGC ads:
- SHARP OBSERVATION: Look very closely. If you see a single gummy, a drop of liquid, or a smudge of cream that isn't part of the packaging, mark "hasInnerProduct": true.
- For components that ARE VISIBLE in the image (package_hero_clean, product_closeup):
  → The goal is to EXTRACT and CLEAN the real product, preserving its exact real-world appearance.
  → Prompts should say "Isolate [component] from this reference image with a clean white background".
  → Do NOT say "create", "generate", or "design" a new product — say "isolate", "extract", "clean".
  → This produces realistic reference images that look like the actual product a creator will hold.
- Always include in every prompt: "Pure white background, professional studio product photography, ultra sharp, photorealistic. Preserve all existing text and logos on the packaging exactly as they appear in the reference image. Strictly no added text, floating words, or watermarks."`;

    const response = await this.gemini.models.generateContent({
      model: this.model,
      contents: [
        { text: analysisPrompt },
        { inlineData: { mimeType: contentType, data: base64Image } },
      ],
      config: { responseMimeType: "application/json" },
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = JSON.parse(text);

    return {
      hasPackaging: result.hasPackaging ?? false,
      hasInnerProduct: result.hasInnerProduct ?? false,
      hasMultipleComponentsTogether: result.hasMultipleComponentsTogether ?? false,
      packageDescription: result.packageDescription || "",
      innerProductDescription: result.innerProductDescription || "",
      innerProductShape: result.innerProductShape || "",
      brandColors: result.brandColors || "",
      overallStyle: result.overallStyle || "",
      rendersToGenerate: (result.rendersToGenerate || []).map((r: any) => ({
        type: r.type,
        reasoning: r.reasoning || "",
        prompt: r.prompt || "",
      })),
    };
  }

  /**
   * Check if a product is clearly visible in a given frame.
   */
  async checkProductVisibility(
    imageUrl: string,
    productInfo: { name?: string; description?: string; referenceImageUrls?: string[] },
  ): Promise<{ isVisible: boolean; confidence: number }> {
    try {
      const { buffer, contentType } = await fileUrlToBuffer(imageUrl);
      const base64Image = buffer.toString("base64");

      let prompt = `Analyze the target image to determine if the product described below is clearly and prominently visible. 
`;
      if (productInfo.name) prompt += `Product Name: ${productInfo.name}\n`;
      if (productInfo.description) prompt += `Product Description: ${productInfo.description}\n`;

      if (productInfo.referenceImageUrls && productInfo.referenceImageUrls.length > 0) {
        prompt += `\nYou are also provided with reference images of the product for comparison.`;
      }

      prompt += `
Identify if the product is:
1. Clearly visible and recognizable.
2. Partially obscured or missing.
3. Completely absent.

Return ONLY a JSON object:
{
  "isVisible": true/false,
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of what is seen"
}`;

      const contents: any[] = [{ text: prompt }];

      // Add reference images first
      if (productInfo.referenceImageUrls && productInfo.referenceImageUrls.length > 0) {
        for (const url of productInfo.referenceImageUrls.slice(0, 2)) {
          const { buffer: refBuffer, contentType: refContentType } = await fileUrlToBuffer(url);
          const prepared = await this.prepareImageForGemini(refBuffer, refContentType);
          contents.push({ inlineData: prepared });
        }
      }

      // Add the target image last
      contents.push({ text: "TARGET IMAGE TO ANALYZE:" });
      contents.push({ inlineData: { mimeType: contentType, data: base64Image } });

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents,
        config: { responseMimeType: "application/json" },
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const result = JSON.parse(text);
      return {
        isVisible: result.isVisible ?? false,
        confidence: result.confidence ?? 0,
      };
    } catch (err) {
      console.error("Failed to check product visibility:", err);
      return { isVisible: false, confidence: 0 };
    }
  }

  /**
   * Rewrite a product shot prompt into a generic talking-head shot prompt,
   * maintaining avatar continuity but removing product interaction.
   */
  async rewriteToGenericPrompt(
    shot: VisualShot,
    avatarDescription: string,
    productDescription?: string,
  ): Promise<string> {
    try {
      const prompt = `You are a video prompt engineer for a professional UGC ad studio. 
Rewrite the following product-focused video prompt into a generic talking-head shot of the avatar speaking to the camera.

### RULES:
1. REMOVE all mention of the product or interaction with it.
2. ABSOLUTELY NO mention of ${productDescription || "the product"}. 
3. REMOVE actions like "holding", "showing", "pointing to", "revealing", "opening", "tasting", or "applying".
4. MAINTAIN the avatar's appearance and the scene aesthetic exactly.
5. DESCRIBE the avatar speaking naturally, gesturing with their hands, and maintaining eye contact with the lens.
6. The ACTION MUST be a description of the person's performance while speaking the narration words.

Original videoPrompt: ${shot.videoPrompt}
Avatar Description: ${avatarDescription}
Scene Prompt: ${shot.scenePrompt}
Narration Words: ${shot.words || ""}

The new prompt should describe the avatar speaking the narration words naturally, with appropriate facial expressions and hand gestures. 
Keep it concise and descriptive for Veo 3.1.

Return ONLY the rewritten videoPrompt string.`;

      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: [{ text: prompt }],
      });

      return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || shot.videoPrompt || "";
    } catch (err) {
      console.error("Failed to rewrite prompt:", err);
      return shot.videoPrompt || "";
    }
  }

  /**
   * Preprocess raw product asset URLs into clean, isolated reference images.
   * Adaptively generates only the renders that make sense based on what is actually in each image.
   * Returns an array of R2-hosted clean asset URLs.
   */
  async preprocessProductAssets(
    rawAssetUrls: string[],
    nano3Model: string = "gemini-3-pro-image-preview",
  ): Promise<{ url: string; prompt: string; label: string; analysis: any }[]> {
    const { uploadBase64ToR2 } = await import("@/lib/upload-utils");
    const MAX_TOTAL_RESULTS = 2;

    // Process each raw asset URL, collect all render jobs
    const allRenderJobs: {
      label: string;
      prompt: string;
      rawImagePart: any;
      analysis: any;
    }[] = [];

    // Collect up to 2 render jobs per asset
    for (const url of rawAssetUrls) {
      try {
        const analysis = await this.analyzeProductComponents(url);
        console.log(`Asset analysis for ${url}:`, {
          hasPackaging: analysis.hasPackaging,
          hasInnerProduct: analysis.hasInnerProduct,
          rendersToGenerate: analysis.rendersToGenerate.map((r: any) => r.type),
        });

        const { buffer: rawBuffer, contentType: rawContentType } = await fileUrlToBuffer(url);
        const rawImagePart = {
          inlineData: {
            mimeType: rawContentType,
            data: rawBuffer.toString("base64"),
          },
        };

        const renders = analysis.rendersToGenerate
          .filter((task: any) => task.prompt && task.prompt.length > 20)
          .slice(0, 2);

        for (const task of renders) {
          allRenderJobs.push({
            label: task.type,
            prompt: task.prompt,
            rawImagePart,
            analysis,
          });
        }
      } catch (err) {
        console.error(`Failed to analyze asset ${url}:`, err);
      }
    }

    // Step 2: Deduplicate and Prioritize labels
    // We want at most one 'package_hero_clean' and one 'product_closeup' across ALL images.
    // They should be the first two in the final list.
    const finalJobs: typeof allRenderJobs = [];
    const usedLabels = new Set<string>();

    // Priority 1: package_hero_clean
    const packageHero = allRenderJobs.find((j) => j.label === "package_hero_clean");
    if (packageHero) {
      finalJobs.push(packageHero);
      usedLabels.add("package_hero_clean");
    }

    // Priority 2: product_closeup
    const productCloseup = allRenderJobs.find((j) => j.label === "product_closeup");
    if (productCloseup) {
      finalJobs.push(productCloseup);
      usedLabels.add("product_closeup");
    }

    // Priority 3: Fill the rest up to MAX_TOTAL_RESULTS
    for (const job of allRenderJobs) {
      if (finalJobs.length >= MAX_TOTAL_RESULTS) break;

      // Allow multiple lifestyles or other types, but skip the ones we already prioritized
      const isPriorityType = job.label === "package_hero_clean" || job.label === "product_closeup";
      if (isPriorityType && usedLabels.has(job.label)) continue;

      finalJobs.push(job);
    }

    if (finalJobs.length === 0) {
      // Fallback if analysis produced nothing
      for (const url of rawAssetUrls.slice(0, 1)) {
        const { buffer: rawBuffer, contentType: rawContentType } = await fileUrlToBuffer(url);
        finalJobs.push({
          label: "fallback_hero",
          prompt:
            `Isolate the product from this reference image onto a pure white background. ` +
            `Professional studio product photography, ultra sharp, photorealistic. Strictly no text or watermarks.`,
          rawImagePart: {
            inlineData: {
              mimeType: rawContentType,
              data: rawBuffer.toString("base64"),
            },
          },
          analysis: null,
        });
      }
    }

    // Step 3: Run ALL renders in parallel
    const JobsToExecute = finalJobs.slice(0, MAX_TOTAL_RESULTS);
    console.log(`Running ${JobsToExecute.length} renders in parallel...`);
    const renderResults = await Promise.all(
      JobsToExecute.map(async (render) => {
        try {
          const renderResponse = await this.gemini.models.generateContent({
            model: nano3Model,
            contents: [{ text: render.prompt }, render.rawImagePart],
            config: {
              imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
            },
          });

          const parts = renderResponse?.candidates?.[0]?.content?.parts || [];
          const base64Data = parts.find((p: any) => p.inlineData?.data)?.inlineData?.data;

          if (base64Data) {
            const filename = `assets/product-clean-${nanoid()}.png`;
            const r2Url = await uploadBase64ToR2(base64Data, filename, "image/png");
            console.log(`✓ Rendered [${render.label}]: ${r2Url}`);
            return {
              url: r2Url,
              prompt: render.prompt,
              label: render.label,
              analysis: render.analysis,
            };
          } else {
            console.warn(`⚠ No image data returned for [${render.label}]`);
            return null;
          }
        } catch (renderErr) {
          console.error(`Failed to render [${render.label}]:`, renderErr);
          return null;
        }
      }),
    );

    const successfulResults = renderResults.filter((r): r is NonNullable<typeof r> => r !== null);

    // Fallback: if nothing rendered, return originals
    return successfulResults.length > 0
      ? successfulResults
      : rawAssetUrls.map((url) => ({
          url,
          prompt: "Fallback (no renders succeeded)",
          label: "original",
          analysis: null,
        }));
  }

  private buildPromptTiming(segmentsData: any[]): string {
    let context =
      "You are a video editing assistant. Your goal is to extract precise start and end times (in seconds) for each shot and B-roll in multiple segments based on their transcripts.\n\n";

    segmentsData.forEach((seg, idx) => {
      context += `--- Segment ${idx + 1} (ID: ${seg.id}) ---\n`;
      context += `Audio Configuration: { startPause: ${seg.startPause}ms, endPause: ${seg.endPause}ms, totalDuration: ${seg.duration}ms }\n`;
      context += `Note: The transcript word timestamps ('s' and 'e') are absolute within the audio file and ALREADY include the startPause offset.\n`;
      context += `Transcript Words:\n${JSON.stringify(seg.transcript.results.main.words.map((w: any) => ({ w: w.word, s: w.start, e: w.end })))}\n`;

      context += `Shots to time:\n`;
      seg.shots.forEach((s: any, sIdx: number) => {
        context += `  Shot ${sIdx}: "${s.words || ""}"\n`;
      });

      context += `B-rolls to time:\n`;
      seg.bRolls.forEach((br: any, brIdx: number) => {
        context += `  B-roll ${brIdx}: "${br.words || ""}"\n`;
      });
      context += "\n";
    });

    context += `
RULES:
1. Returns a JSON object following the schema:
{
  "segments": [
    {
      "segmentId": string,
      "shots": [{"start": number, "end": number}],
      "bRolls": [{"originalIndex": number, "start": number, "end": number}]
    }
  ]
}
2. Use the provided word timestamps ('s' and 'e') PRECISELY. Do NOT normalize them or round them.
3. For B-rolls, find the exact word range in the transcript that matches the trigger words and return their absolute 's' and 'e' values.
4. For Shots, the 'end' time of shot N is the 's' value of the first word of shot N+1.
5. The 'end' time of the LAST shot should be the 'e' value of the final word in that segment's transcript.
6. Crucial: Do NOT ignore the startPause. The word timestamps already include it. If a word starts at 0.2s, return 0.2.
7. If no matches are found, provide your best estimation based on the sequence and duration.
`;

    return context;
  }

  async getBatchTimings(
    segmentsData: {
      id: string;
      shots: { words?: string }[];
      bRolls: { words?: string }[];
      transcript: any; // The caption.json content
      startPause: number;
      endPause: number;
      duration: number;
    }[],
  ): Promise<BatchTimingResponse> {
    const prompt = this.buildPromptTiming(segmentsData);

    try {
      const response = await this.gemini.models.generateContent({
        model: this.model, // Use the confirmed available model
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
        },
      });
      const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return JSON.parse(responseText) as BatchTimingResponse;
    } catch (err) {
      console.error("[TIMING-GEMINI] Error extracting batch timings:", err);
      // Return empty structure so caller can handle fallback
      return { segments: [] };
    }
  }
}
