import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { projectQueries } from "@/lib/database/project-queries";
import { segmentQueries } from "@/lib/database/segment-queries";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Session is optional — unauthenticated visitors can still view public projects
    const session = await auth.api.getSession(req);

    const { id: generationId } = await params;
    if (!generationId) {
      return Response.json({ error: "ID is required" }, { status: 400 });
    }

    // 1. Find the project using generationId
    const project = await projectQueries.findByGenerationId(generationId);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Allow access if:
    //   a) The user is the owner, OR
    //   b) The project is public (regardless of auth state)
    const isOwner = !!session && project.user_id === session.user.id;
    if (!isOwner && !project.public) {
      // Non-public and either not logged in or not the owner
      return Response.json(
        { error: !session ? "Unauthorized" : "Forbidden" },
        { status: !session ? 401 : 403 },
      );
    }

    // 2. Find the schema using projectId
    const schema = await segmentQueries.findSchemaByProjectId(project.id);
    if (!schema) {
      return Response.json({
        status:
          (project.generation_metadata as any)?.message || project.generation_status || "PENDING",
        message: "Schema is being generated",
      });
    }

    // 3. Find all segments using schemaId
    const segments = await segmentQueries.findSegmentsBySchemaId(schema.id);

    // 4. Assemble and return a VideoSchema object
    const finalSchema = {
      id: generationId,
      status:
        project.generation_status === "COMPLETED"
          ? "COMPLETED"
          : (project as any).generation_metadata?.message || project.generation_status,
      schemaId: schema.id,
      type: schema.type,
      title: schema.title,
      description: schema.description,
      promptPreview: schema.prompt_preview,
      tags: schema.tags,
      music: schema.music,
      voice: schema.voice,
      visuals: schema.visuals,
      caption: schema.caption,
      script: schema.script,
      aspectRatio: schema.aspect_ratio,
      animation: (schema.metadata as any)?.animation,
      avatar: schema.avatar,
      assets: schema.assets,
      segments: segments.map((s) => {
        const data = s.segment_data as any;
        let shots = data.shots || [];
        if (shots && !Array.isArray(shots)) {
          shots = [shots];
        }
        return {
          ...data,
          shots,
        };
      }),
    };

    return Response.json({ ...finalSchema, isOwner, isPublic: !!project.public });
  } catch (error: any) {
    console.error("Failed to get scheme:", error);
    return Response.json(
      { error: "Failed to get scheme", details: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession(req);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: generationId } = await params;
    const body = await req.json();
    const { schema: schemaUpdates, segments: segmentUpdates, deletedIds } = body;

    // Helper to ensure JSON fields are objects if they came as strings
    const ensureObject = (val: any) => {
      if (!val) return null;
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return val;
        }
      }
      return val;
    };

    const toJSONB = (val: any) => {
      const obj = ensureObject(val);
      return obj ? JSON.stringify(obj) : null;
    };

    // 1. Find the project
    const project = await projectQueries.findByGenerationId(generationId);
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Allow edits if user owns the project OR the project is public
    const isOwner = project.user_id === session.user.id;
    if (!isOwner && !project.public) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const schema = await segmentQueries.findSchemaByProjectId(project.id);
    if (!schema) {
      return Response.json({ error: "Schema not found" }, { status: 404 });
    }

    // 2. Update root schema if needed
    if (schemaUpdates) {
      const allowedColumns = [
        "project_id",
        "title",
        "description",
        "prompt_preview",
        "tags",
        "music",
        "voice",
        "visuals",
        "caption",
        "resolution",
        "aspect_ratio",
        "type",
        "execution_mode",
        "avatar",
        "assets",
        "metadata",
        "script",
        "updated_at",
      ];

      const jsonColumns = ["music", "voice", "visuals", "caption", "avatar", "assets", "metadata"];

      const dbUpdates: any = {};

      // Map and filter fields
      for (const [key, value] of Object.entries(schemaUpdates)) {
        let dbKey = key;
        if (key === "aspectRatio") dbKey = "aspect_ratio";
        if (key === "promptPreview") dbKey = "prompt_preview";

        if (allowedColumns.includes(dbKey)) {
          if (jsonColumns.includes(dbKey)) {
            dbUpdates[dbKey] = toJSONB(value);
          } else {
            dbUpdates[dbKey] = value;
          }
        }
      }

      if (Object.keys(dbUpdates).length > 0) {
        await segmentQueries.updateSchema(schema.id, dbUpdates);
      }
    }

    // 3. Update segments if needed
    if (segmentUpdates && Array.isArray(segmentUpdates)) {
      const existingSegments = await segmentQueries.findSegmentsBySchemaId(schema.id);

      const bulkUpdates = segmentUpdates
        .map((update: any) => {
          const existing = existingSegments.find((s) => (s.segment_data as any).id === update.id);
          if (!existing) return null;

          const newData = {
            ...(existing.segment_data as any),
            ...update,
          };
          return {
            id: existing.id,
            segment_data: toJSONB(newData),
          };
        })
        .filter(Boolean) as any[];

      if (bulkUpdates.length > 0) {
        await segmentQueries.bulkUpdateSegments(bulkUpdates);
      }
    }

    // 4. Delete segments if needed
    if (deletedIds && Array.isArray(deletedIds) && deletedIds.length > 0) {
      const existingSegments = await segmentQueries.findSegmentsBySchemaId(schema.id);
      const dbIdsToDelete = existingSegments
        .filter((s) => deletedIds.includes((s.segment_data as any).id))
        .map((s) => s.id);

      if (dbIdsToDelete.length > 0) {
        await segmentQueries.bulkDeleteSegments(dbIdsToDelete);
      }
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update scheme:", error);
    return Response.json(
      { error: "Failed to update scheme", details: error.message },
      { status: 500 },
    );
  }
}
