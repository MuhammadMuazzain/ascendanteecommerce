import { NextResponse } from "next/server";
import { getInngestApp } from "@/inngest";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ensureObject } from "@/inngest/functions/common/services/utils";
import { segmentQueries } from "@/lib/database/segment-queries";
import { generationQueries } from "@/lib/database/generation-queries";
import { generateId } from "@/utils/id";
import { nanoid } from "nanoid";
import { projectQueries } from "@/lib/database/project-queries";

export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      schemeId,
      segmentId,
      shotId,
      firstFrameUrl,
      lastFrameUrl,
      aspectRatio = "9:16",
      prompt,
      videoPrompt: bodyVideoPrompt,
      avatarUrl,
      productUrls,
      mode,
      firstFrameSource,
      projectId = null,
    } = body;

    const videoPrompt = bodyVideoPrompt || prompt;

    if (!schemeId || !segmentId || !videoPrompt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const generationId = `gen-${nanoid()}`;
    const assetId = nanoid();

    // Trigger Inngest function
    const inngest = getInngestApp();

    if (mode === "image") {
      // Synchronously set status to generating and create generation record
      try {
        await generationQueries.create({
          id: generationId,
          status: "PENDING",
          progress: 0,
          user_id: userId,
          input: body,
          metadata: {
            type: "ugc-image-generation",
            schemeId,
            segmentId,
            shotId,
            assetId,
          },
        });

        // For image generation, we might not need to update segment status synchronously
        // as the hook handles it, but let's be consistent if possible.
      } catch (e) {
        console.error("Failed to update status synchronously", e);
      }

      await inngest.send({
        name: "ugc/shot.generate.image",
        data: {
          generationId,
          schemeId,
          segments: [
            {
              id: segmentId,
              shotId,
              description: videoPrompt,
              ...body.segmentData, // Pass through any extra segment data
            },
          ],
          avatarUrl,
          productUrls,
          aspectRatio,
          userId,
          assetId,
          projectId,
        },
      });

      return NextResponse.json({
        success: true,
        generationId,
        assetId,
        message: "UGC Image Generation started",
      });
    }

    // Default to video generation
    // Synchronously set status to generating and create generation record
    try {
      await generationQueries.create({
        id: generationId,
        status: "PENDING",
        progress: 0,
        user_id: userId,
        input: body,
        metadata: {
          type: "ugc-shot-generation",
          schemeId,
          segmentId,
          shotId,
          assetId,
        },
      });

      let schema = await segmentQueries.findSchemaById(schemeId);
      let targetSchemeId = schemeId;

      if (!schema) {
        const project = await projectQueries.findByGenerationId(schemeId);
        if (project) {
          schema = await segmentQueries.findSchemaByProjectId(project.id);
          if (schema) targetSchemeId = schema.id;
        }
      }

      if (schema) {
        const dbSegments = await segmentQueries.findSegmentsBySchemaId(targetSchemeId);
        const segsWithDbId = dbSegments.map((s: any) => {
          const data = ensureObject(s.segment_data);
          return { ...data, dbId: s.id };
        });

        const seg = segsWithDbId.find((s: any) => s.id === segmentId);
        if (seg && seg.shots && seg.shots[0]) {
          seg.shots[0].status = "generating";
          seg.shots[0].generationId = generationId;
          seg.shots[0].error = undefined;

          // Ensure we use the latest prompt from the request body
          seg.shots[0].videoPrompt = videoPrompt;

          const dbId = seg.dbId;
          const cleanSeg = { ...seg };
          delete (cleanSeg as any).dbId;

          await segmentQueries.bulkUpdateSegments([{ id: dbId, segment_data: cleanSeg }]);
        }
      }
    } catch (e) {
      console.error("Failed to update status synchronously", e);
    }

    await inngest.send({
      name: "ugc/shot.generate.video",
      data: {
        generationId,
        schemeId,
        segmentId,
        shotId,
        firstFrameUrl,
        lastFrameUrl,
        aspectRatio,
        videoPrompt,
        userId,
        assetId,
        avatarUrl,
        productUrls,
        mode,
        firstFrameSource,
        projectId,
      },
    });

    return NextResponse.json({
      success: true,
      generationId,
      assetId,
      message: "UGC Video Generation started",
    });
  } catch (error: any) {
    console.error("UGC shot generation API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
