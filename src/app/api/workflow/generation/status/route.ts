import { NextResponse } from "next/server";
import { generationQueries } from "@/lib/database/generation-queries";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing generation ID" }, { status: 400 });
    }

    const generation = await generationQueries.findById(id);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      progress: generation.progress,
      output: generation.output,
      metadata: generation.metadata,
    });
  } catch (error: any) {
    console.error("Error fetching generation status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
