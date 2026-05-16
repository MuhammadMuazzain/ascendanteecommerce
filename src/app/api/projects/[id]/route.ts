import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectQueries } from "@/lib/database/project-queries";
import { folderQueries } from "@/lib/database/folder-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { db } from "@/lib/database";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await projectQueries.findById(id);

  if (!project || project.user_id !== userId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Get all assets for this project
  const assets = await db
    .selectFrom("assets")
    .selectAll()
    .where("project_id", "=", id)
    .orderBy("created_at", "desc")
    .execute();

  // Get segments and schema
  // Get segments and schema
  const segments = await segmentQueries.findByProjectId(id);
  const schemas = await segmentQueries.findAllSchemasByProjectId(id);
  // Return only project-specific fields and assets
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

  return Response.json({
    project: cleanedProject,
    assets,
    segments,
    schemas,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await projectQueries.findById(id);

  if (!project || project.user_id !== userId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, folderId, public: isPublic } = body;

  // Validate folderId if provided
  if (folderId !== undefined && folderId !== null) {
    const folder = await folderQueries.findById(folderId);
    if (!folder || folder.user_id !== userId) {
      return Response.json({ error: "Folder not found or access denied" }, { status: 404 });
    }
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (isPublic !== undefined) updates.public = isPublic;
  if (folderId !== undefined) {
    // Use moveToFolder for folder changes
    if (folderId !== project.folder_id) {
      const updated = await projectQueries.moveToFolder(id, folderId);
      return Response.json({ project: updated });
    }
  }

  if (Object.keys(updates).length > 0) {
    const updated = await projectQueries.update(id, updates);
    return Response.json({ project: updated });
  }

  return Response.json({ project });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  console.log("DELETE");
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await projectQueries.findById(id);

  if (!project || project.user_id !== userId) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await projectQueries.delete(id);
  return Response.json({ success: true });
}
