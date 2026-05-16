import { NextResponse } from "next/server";
import { getInngestApp } from "@/inngest";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ensureObject } from "@/inngest/functions/common/services/utils";
import { segmentQueries } from "@/lib/database/segment-queries";
import { generationQueries } from "@/lib/database/generation-queries";
import { generateId } from "@/utils/id";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    const body = await req.json();
    const { schemeId, segmentId, shotId, shotIndex, prompt, shotType, projectId, model, mode } =
      body;

    const generationMode = mode === "video" ? "video" : "image";

    if (!schemeId || !segmentId || (shotId == null && shotIndex === undefined)) {
      return NextResponse.json(
        { error: "Missing schemeId, segmentId, or shot identifier" },
        { status: 400 },
      );
    }

    const schema = await segmentQueries.findSchemaById(schemeId);
    if (!schema) {
      return NextResponse.json({ error: "Scheme not found" }, { status: 404 });
    }

    const dbSegments = await segmentQueries.findSegmentsBySchemaId(schemeId);
    const segsWithDbId = dbSegments.map((s: any) => {
      const data = ensureObject(s.segment_data);
      return { ...data, dbId: s.id };
    });

    const seg = segsWithDbId.find((s: any) => s.id === segmentId);
    if (!seg?.shots?.length) {
      return NextResponse.json({ error: "Segment or shots not found" }, { status: 404 });
    }

    let idx = -1;
    if (shotId != null) idx = seg.shots.findIndex((s: any) => s.id === shotId);
    if (idx === -1 && shotIndex !== undefined) idx = shotIndex;
    if (idx === -1 || !seg.shots[idx]) {
      return NextResponse.json({ error: "Shot not found in segment" }, { status: 404 });
    }

    const targetShot = seg.shots[idx];
    const resolvedShotType =
      shotType || targetShot.type || ("generic" as string);

    let resolvedPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!resolvedPrompt) {
      if (generationMode === "video") {
        resolvedPrompt = (
          targetShot.videoPrompt ||
          targetShot.scenePrompt ||
          (targetShot as any).words ||
          ""
        ).trim();
      } else {
        resolvedPrompt = (
          targetShot.firstFramePrompt ||
          targetShot.scenePrompt ||
          seg.description ||
          ""
        ).trim();
      }
    }

    if (!resolvedPrompt) {
      return NextResponse.json(
        { error: "No prompt available for this shot — edit the shot prompt or segment description." },
        { status: 400 },
      );
    }

    const generationId = generateId();

    try {
      await generationQueries.create({
        id: generationId,
        status: "PENDING",
        progress: 0,
        user_id: userId || null,
        input: {
          segmentId,
          shotIndex: idx,
          prompt: resolvedPrompt,
          shotType: resolvedShotType,
          model,
        },
        metadata: { type: "shot-generation", schemeId, model },
      });

      targetShot.status = "generating";
      targetShot.generationId = generationId;
      targetShot.error = undefined;

      if (generationMode === "image") {
        delete (targetShot as any).videoUrl;
        if ((seg.shots?.length ?? 0) <= 1) {
          seg.assets = (seg.assets || []).map((a: any) =>
            a.type === "video" ? { ...a, active: false } : a,
          );
        }
      }

      const dbId = seg.dbId;
      const cleanSeg = { ...seg };
      delete (cleanSeg as any).dbId;

      await segmentQueries.bulkUpdateSegments([{ id: dbId, segment_data: cleanSeg }]);
    } catch (e) {
      console.error("Failed to update status synchronously", e);
    }

    const inngest = getInngestApp();

    await inngest.send({
      name:
        generationMode === "video"
          ? "standard/shot.generate.video"
          : "standard/shot.generate.image",
      data: {
        generationId,
        schemeId,
        segmentId,
        shotId,
        shotIndex: idx,
        prompt: resolvedPrompt,
        shotType: resolvedShotType,
        projectId,
        userId,
        model,
        mode: generationMode,
      },
    });

    return NextResponse.json({ success: true, generationId, message: "Generation started" });
  } catch (error: any) {
    console.error("Shot generation API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
