import { NextResponse } from "next/server";
import type { Schema } from "@/lib/schema-generator/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.schema) {
      return NextResponse.json({ error: "The 'schema' field is required" }, { status: 400 });
    }

    // Validate schema structure
    const schema = body.schema as Schema;
    if (!schema.segments || !Array.isArray(schema.segments)) {
      return NextResponse.json(
        { error: "The 'schema' must have a 'segments' array" },
        { status: 400 },
      );
    }

    if (!schema.caption || !schema.caption.id) {
      return NextResponse.json(
        { error: "The 'schema' must have a 'caption' with an 'id'" },
        { status: 400 },
      );
    }

    if (!schema.aspectRatio) {
      return NextResponse.json(
        { error: "The 'schema' must have an 'aspectRatio'" },
        { status: 400 },
      );
    }

    // Convert schema to scene
    const scene = {};
    return NextResponse.json({ scene }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in /api/convert-schema-to-scene:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Error converting schema to scene", details: errorMessage },
      { status: 500 },
    );
  }
}
