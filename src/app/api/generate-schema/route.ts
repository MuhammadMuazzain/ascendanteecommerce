import { NextResponse } from "next/server";
import generateSchema from "@/lib/schema-generator";
import type { Schema } from "@/lib/schema-generator/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.script) {
      return NextResponse.json({ error: "The 'script' field is required" }, { status: 400 });
    }

    if (!body.aspectRatio) {
      return NextResponse.json({ error: "The 'aspectRatio' field is required" }, { status: 400 });
    }

    if (!body.voice || !body.voice.id) {
      return NextResponse.json(
        { error: "The 'voice' field with 'id' and 'speed' is required" },
        { status: 400 },
      );
    }

    if (!body.visuals || !body.visuals.type || !body.visuals.style) {
      return NextResponse.json(
        { error: "The 'visuals' field with 'type' and 'style' is required" },
        { status: 400 },
      );
    }

    // Create schema input
    const input: Schema = {
      title: "",
      description: "",
      tags: [],
      prompt_preview: "",
      segments: [],
      script: body.script,
      aspectRatio: body.aspectRatio,
      voice: body.voice,
      visuals: body.visuals,
      music: body.music,
      caption: body.caption,
      pacing: body.pacing,
    };

    // Generate schema using the schema generator
    const schema = await generateSchema(input);

    return NextResponse.json(schema, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/generate-schema:", error);
    return NextResponse.json(
      { error: "Error generating schema", details: error.message },
      { status: 500 },
    );
  }
}
