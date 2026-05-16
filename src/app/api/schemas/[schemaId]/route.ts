import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectQueries } from "@/lib/database/project-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { sceneQueries } from "@/lib/database/scene-queries";
import { db } from "@/lib/database";

export async function GET(req: Request, { params }: { params: Promise<{ schemaId: string }> }) {
  console.log("API schema request");
  // Session is optional — unauthenticated visitors can view public projects
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  const { schemaId } = await params;

  // 1. Fetch the schema
  const schema = await segmentQueries.findSchemaById(schemaId);
  console.log({ schema });
  if (!schema) {
    return Response.json({ error: "Schema not found" }, { status: 404 });
  }

  // 2. Fetch the project to verify access
  const project = await projectQueries.findById(schema.project_id);

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Allow access if:
  //   a) The user is the owner, OR
  //   b) The project is public (regardless of auth state)
  const isOwner = !!userId && project.user_id === userId;
  if (!isOwner && !project.public) {
    return Response.json(
      { error: !userId ? "Unauthorized" : "Access denied" },
      { status: !userId ? 401 : 403 },
    );
  }

  // 3. Fetch related segments
  const segments = await segmentQueries.findSegmentsBySchemaId(schemaId);

  // 4. Fetch assets (optional but good for context if needed in editor)
  const assets = await db
    .selectFrom("assets")
    .selectAll()
    .where("project_id", "=", project.id)
    .orderBy("created_at", "desc")
    .execute();

  // 5. Check for existing scene
  const existingScene = await sceneQueries.findBySchemaId(schemaId);

  // Return structure compatible with the frontend ProjectData interface
  const cleanedProject = {
    id: project.id,
    name: project.name,
    type: project.type,
    description: project.description,
    thumbnail: project.thumbnail,
    public: project.public,
    user_id: project.user_id,
    folder_id: project.folder_id,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };

  console.log("API schema response: animation =", (schema.metadata as any)?.animation);
  return Response.json({
    project: cleanedProject,
    schemas: [
      {
        ...schema,
        animation: (schema.metadata as any)?.animation,
      },
    ],
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
    assets: assets,
    scene: existingScene || null,
    isOwner,
    isPublic: !!project.public,
  });
}
