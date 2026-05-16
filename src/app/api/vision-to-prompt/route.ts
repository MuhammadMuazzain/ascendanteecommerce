import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { fileUrlToBuffer } from "@/inngest/functions/common/utils/common";
import { buildVisionAnalysisPrompt } from "@/lib/prompts";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY is not defined" },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenAI({ apiKey });
    const { imageUrls, productName, productDescription } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "imageUrls array is required" }, { status: 400 });
    }

    const model = "gemini-2.5-flash-lite"; // Fixed to valid model name

    const imagesData = await Promise.all(
      imageUrls.map(async (url: string) => {
        try {
          const { buffer, contentType } = await fileUrlToBuffer(url);
          return {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: contentType,
            },
          };
        } catch (err: any) {
          console.error(`Failed to process image URL: ${url}`, err.message);
          return null;
        }
      }),
    );

    const validImagesContent = imagesData.filter((img) => img !== null) as any[];

    if (validImagesContent.length === 0) {
      return NextResponse.json(
        { error: "Failed to process any of the provided image URLs" },
        { status: 400 },
      );
    }

    const prompt = buildVisionAnalysisPrompt(productName, productDescription);

    const result = await (genAI as any).models.generateContent({
      model,
      contents: [{ text: prompt }, ...validImagesContent],
      config: {
        responseMimeType: "application/json",
      },
    });
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Error in vision-to-prompt API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
