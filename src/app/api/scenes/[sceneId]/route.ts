import { db } from "@/lib/database";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: Request, { params }: { params: Promise<{ sceneId: string }> }) {
  try {
    const { sceneId } = await params;

    if (!sceneId) {
      return NextResponse.json({ error: "Scene ID is required" }, { status: 400 });
    }
    const scenes = await db.selectFrom("scenes").selectAll().execute();

    console.log("scenes", scenes);

    // Fetch scene from database by scene ID
    const sceneRecord = await db
      .selectFrom("scenes")
      .selectAll()
      .where("id", "=", sceneId)
      .executeTakeFirst();

    if (!sceneRecord) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Parse the sceneData (it's stored as JSON string)
    let sceneData: any;
    try {
      sceneData =
        typeof sceneRecord.scene_data === "string"
          ? JSON.parse(sceneRecord.scene_data)
          : sceneRecord.scene_data;
    } catch (parseError) {
      console.error("Error parsing sceneData:", parseError);
      return NextResponse.json({ error: "Invalid scene data format" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scene: sceneData,
      sceneId: sceneRecord.id,
    });
  } catch (error) {
    console.error("Error fetching scene:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch scene",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ sceneId: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sceneId } = await params;

  // Find the scene
  const scene = await db
    .selectFrom("scenes")
    .selectAll()
    .where("id", "=", sceneId)
    .executeTakeFirst();

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  // Check ownership
  if (scene.user_id && scene.user_id !== userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const generationId = scene.generation_id;

    // Delete associated projects
    // We search for projects linked either by sceneId or generationId
    const projects = await db
      .selectFrom("projects")
      .select("id")
      .where((eb) => eb.or([eb("scene_id", "=", sceneId), eb("generation_id", "=", generationId)]))
      .execute();

    for (const p of projects) {
      await db.deleteFrom("projects").where("id", "=", p.id).execute();
    }

    // Delete Scene
    await db.deleteFrom("scenes").where("id", "=", sceneId).execute();

    // Delete Generation
    if (generationId) {
      await db.deleteFrom("generations").where("id", "=", generationId).execute();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting resources:", error);
    return NextResponse.json(
      {
        error: "Failed to delete resources",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
