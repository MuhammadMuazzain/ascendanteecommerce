import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectQueries } from "@/lib/database/project-queries";
import { folderQueries } from "@/lib/database/folder-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { resolveProjectPreview } from "@/lib/project-preview";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const generationId = searchParams.get("generationId");

  let projects;
  if (generationId) {
    const project = await projectQueries.findByGenerationId(generationId);
    // Ensure the project belongs to the authenticated user
    if (project && project.user_id !== userId) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    projects = project ? [project] : [];
  } else if (folderId === "null" || folderId === "") {
    // Get root projects (no folder)
    projects = await projectQueries.findRootProjects(userId);
  } else if (folderId) {
    // Validate folder belongs to user
    const folder = await folderQueries.findById(folderId);
    if (!folder || folder.user_id !== userId) {
      return Response.json({ error: "Folder not found" }, { status: 404 });
    }
    projects = await projectQueries.findByFolderId(folderId);
  } else {
    // Get all projects for user
    projects = await projectQueries.findByUserId(userId);
  }

  // Transform to camelCase for client consumption
  // Get all project IDs
  const projectIds = projects?.map((p: any) => p.id) || [];

  // Fetch all schemas and segments for exactly those projects to avoid N+1
  const [allSchemas, allSegments] = await Promise.all([
    segmentQueries.findAllSchemasByProjectIds(projectIds),
    segmentQueries.findByProjectIds(projectIds),
  ]);

  const segmentsByProject = allSegments.reduce((acc: Record<string, typeof allSegments>, segment) => {
    const projectId = segment.project_id;
    if (!projectId) return acc;
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(segment);
    return acc;
  }, {});

  // Group schemas by project ID
  const schemasByProject = allSchemas.reduce((acc: any, schema: any) => {
    if (!acc[schema.project_id]) {
      acc[schema.project_id] = [];
    }
    acc[schema.project_id].push(schema);
    return acc;
  }, {});

  // Transform to camelCase for client consumption
  const transformedProjects = (projects || []).map((project: any) => {
    const input = project.generation_input as any;
    const status = project.generation_status || "COMPLETED";
    const schemas = schemasByProject[project.id] || [];
    const segments = segmentsByProject[project.id] || [];
    const { previewUrl, previewKind } = resolveProjectPreview(
      {
        thumbnail: project.thumbnail,
        generationPreviewUrl: project.generation_preview_url,
      },
      segments,
    );

    return {
      id: project.id,
      name: project.name,
      generationId: project.generation_id,
      description: project.description,
      thumbnail: project.thumbnail ?? previewUrl,
      previewUrl,
      previewKind,
      public: project.public,
      userId: project.user_id,
      folderId: project.folder_id,
      type: project.type,
      status: status,
      aspectRatio: input?.aspectRatio || "9:16",
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      schemas: schemas,
      generationMetadata: project.generation_metadata,
    };
  });

  // Sort by createdAt desc
  transformedProjects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return Response.json({ projects: transformedProjects });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, folderId, type, schema, schemas: inputSchemas, segments } = body;

    // Validate folder if provided
    if (folderId) {
      const folder = await folderQueries.findById(folderId);
      if (!folder || folder.user_id !== userId) {
        return Response.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    // Create the project
    console.log("Creating project with data:", {
      name,
      folderId,
      type,
      userId,
    });
    const project = await projectQueries.create({
      id: randomUUID(),
      name: name || "Untitled Project",
      user_id: userId,
      folder_id: folderId || null,
      type: type || "ai-editor",
      public: false,
    });
    console.log("Project created:", project);
    const projectId = project.id;

    // Create schema if provided
    if (inputSchemas && Array.isArray(inputSchemas)) {
      // Create schemas and their segments
      // Create schemas and their segments
      await Promise.all(
        inputSchemas.map(async (schema: any) => {
          const schemaId = schema.id || randomUUID();
          await segmentQueries.createSchema({
            id: schemaId,
            project_id: projectId,
            title: schema.title || "Untitled Schema",
            aspect_ratio: schema.aspect_ratio || "9:16",
            type: schema.type || null,
            created_at: schema.created_at,
            updated_at: schema.updated_at,
            execution_mode: schema.execution_mode || "live",
            metadata: schema.metadata || {},
          });

          // Create segments for this schema
          if (schema.segments && Array.isArray(schema.segments)) {
            await segmentQueries.bulkCreateSegments(
              schema.segments.map((s: any, i: number) => ({
                id: s.id || randomUUID(),
                project_id: projectId,
                schema_id: schemaId,
                order: s.order ?? i,
                segment_data: s.segment_data || s,
              })),
            );
          }
        }),
      );
    } else if (schema) {
      const schemaId = schema.id || randomUUID();
      await segmentQueries.createSchema({
        ...schema,
        id: schemaId,
        project_id: projectId,
        type: schema.type || null,
      });

      // Create segments if provided and associated with the schema
      if (segments && Array.isArray(segments)) {
        await segmentQueries.bulkCreateSegments(
          segments.map((s: any, i: number) => ({
            id: s.id || randomUUID(),
            project_id: projectId,
            schema_id: schemaId,
            order: s.order ?? i,
            segment_data: s.segment_data || s,
          })),
        );
      }
    } else if (segments && Array.isArray(segments)) {
      // Create segments without schema if provided
      await segmentQueries.bulkCreateSegments(
        segments.map((s: any, i: number) => ({
          id: s.id || randomUUID(),
          project_id: projectId,
          schema_id: null,
          order: s.order ?? i,
          segment_data: s.segment_data || s,
        })),
      );
    } else if (type === "ai-editor" && !schema) {
      // Create default schema for AI Editor if none provided
      const schemaId = randomUUID();
      console.log("Creating default schema for AI Editor project:", schemaId);

      await segmentQueries.createSchema({
        id: schemaId,
        project_id: projectId,
        title: "Untitled Video",
        aspect_ratio: "9:16",
        type: "ai-editor",
        execution_mode: "editor",
        metadata: {},
      });

      return Response.json({ project: { ...project, schemas: [] }, schemaId }, { status: 201 });
    }
    const schemas = await segmentQueries.findAllSchemasByProjectId(projectId);

    return Response.json({ project: { ...project, schemas: schemas || [] } }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return Response.json({ error: "Failed to create project" }, { status: 500 });
  }
}
