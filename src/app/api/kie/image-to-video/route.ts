import { NextResponse } from "next/server";
import { kie } from "@/lib/kie";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, imageUrls, model = "veo3", aspect_ratio = "16:9", callBackUrl } = body;

    if (!prompt || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "Prompt and imageUrls are required" }, { status: 400 });
    }

    const { data, ok, status } = await kie.generateVideo({
      prompt,
      imageUrls,
      model,
      aspect_ratio,
      callBackUrl,
      generationType: "REFERENCE_2_VIDEO",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/kie/image-to-video:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
