import { ContentListUnion, GoogleGenAI, Part } from "@google/genai";
import { Generator } from "../interface";
import { aspectRatioType } from "@/utils/enum";
import { fileUrlToBuffer } from "@/utils/download";
import sharp from "sharp";
import { cropImage } from "@/utils/common";
import { GeminiParams, NanobananaConfig } from "./types";

export class GeminiProvider implements Generator {
  private gemini: GoogleGenAI;
  private model: string;

  constructor(config: NanobananaConfig) {
    this.gemini = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async create(params: GeminiParams): Promise<string> {
    try {
      const model = params.model || this.model;
      const aspectRatio = params.aspectRatio || aspectRatioType.NINE_SIXTEEN;

      let prompt: ContentListUnion = [{ text: params.prompt }];
      const finalImageInputs = params.imageInputs || params.imageUrls || [];

      if (finalImageInputs.length > 0) {
        const imageData = await Promise.all(
          finalImageInputs.map(async (input) => {
            const { buffer, contentType } =
              typeof input === "string"
                ? await fileUrlToBuffer(input)
                : { buffer: Buffer.from(input.data, "base64"), contentType: input.mimeType };

            const supportedMimeTypes = [
              "image/png",
              "image/jpeg",
              "image/webp",
              "image/heic",
              "image/heif",
            ];

            if (supportedMimeTypes.includes(contentType)) {
              return { base64Image: buffer.toString("base64"), contentType };
            }

            try {
              const convertedBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
              return {
                base64Image: convertedBuffer.toString("base64"),
                contentType: "image/webp",
              };
            } catch (err) {
              console.error(`Failed to convert image ${contentType}:`, err);
              return { base64Image: buffer.toString("base64"), contentType };
            }
          }),
        );
        const images = imageData.map((d) => ({
          inlineData: { mimeType: d.contentType, data: d.base64Image },
        }));
        prompt = [...prompt, ...images];
      }

      const response = await this.gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          imageConfig: { aspectRatio, imageSize: "1K" },
        },
      });

      const parts: Part[] = response?.candidates?.[0]?.content?.parts || [];
      const resultBase64 = parts.find((p) => p.inlineData?.data)?.inlineData?.data || "";

      if (!resultBase64) throw new Error("No image data returned from Gemini");

      if (params.options?.resize) {
        const size = {
          width: params.options.resize.width || 720,
          height: params.options.resize.height || 1280,
        };
        const croppedBase64 = await cropImage(resultBase64, size, params.options);
        const prefix = params.options?.webp ? "data:image/webp;base64," : "data:image/png;base64,";
        return `${prefix}${croppedBase64}`;
      }

      return resultBase64;
    } catch (err: any) {
      console.error(`Gemini generation failed for model ${params.model || this.model}:`, err);
      throw new Error(`Failed to generate image with Gemini: ${err.message}`);
    }
  }
}
