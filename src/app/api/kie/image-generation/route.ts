import { NextResponse } from "next/server";
import { kie } from "@/lib/kie";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      image_input = [],
      aspect_ratio = "1:1",
      resolution = "1K",
      output_format = "png",
      callBackUrl,
    } = body;
    console.log({
      image_input,
      prompt,
      aspect_ratio,
      resolution,
      output_format,
      callBackUrl,
    });
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const { data, ok, status } = await kie.createImageTask({
      model: "nano-banana-pro",
      input: {
        prompt,
        image_input,
        aspect_ratio,
        resolution,
        output_format,
      },
      callBackUrl,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/kie/image-generation:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
