import { NextRequest } from "next/server";
import { segmentQueries } from "@/lib/database/segment-queries";
import { projectQueries } from "@/lib/database/project-queries";
import { ensureObject } from "@/inngest/functions/common/services/utils";

/**
 * Optimized endpoint for polling shot generation status.
 * Takes a schemaId and returns just the segments with their current status.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schemaId = searchParams.get("schemaId");

    if (!schemaId) {
      return Response.json({ error: "schemaId is required" }, { status: 400 });
    }

    // 1. Try finding by schemaId directly
    let segments = await segmentQueries.findSegmentsBySchemaId(schemaId);
    let targetSchemaId = schemaId;

    // 2. If no segments found, maybe schemaId is actually a generationId (NanoID)
    if (segments.length === 0) {
      const project = await projectQueries.findByGenerationId(schemaId);
      if (project) {
        const schema = await segmentQueries.findSchemaByProjectId(project.id);
        if (schema) {
          segments = await segmentQueries.findSegmentsBySchemaId(schema.id);
          targetSchemaId = schema.id;
        }
      }
    }

    if (segments.length === 0) {
      return Response.json({ error: "No segments found for the provided ID" }, { status: 404 });
    }

    // Map segments to the format expected by the frontend
    const mappedSegments = segments.map((s) => {
      const data = ensureObject(s.segment_data);
      let shots = data.shots || [];
      if (shots && !Array.isArray(shots)) {
        shots = [shots];
      }
      return {
        ...data,
        id: data.id || s.id, // Ensure we have the frontend-style ID
        shots,
      };
    });

    return Response.json({
      success: true,
      segments: mappedSegments,
    });
  } catch (error: any) {
    console.error("Workflow state polling error:", error);
    return Response.json(
      { error: "Failed to fetch workflow state", details: error.message },
      { status: 500 },
    );
  }
}
