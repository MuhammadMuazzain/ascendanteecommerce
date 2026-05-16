import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { folderQueries } from "@/lib/database/folder-queries";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folder = await folderQueries.findById(id);

  if (!folder || folder.user_id !== userId) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
  }

  return Response.json({ folder });
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
  const folder = await folderQueries.findById(id);

  if (!folder || folder.user_id !== userId) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name } = body;

  if (name !== undefined && typeof name !== "string") {
    return Response.json({ error: "Invalid folder name" }, { status: 400 });
  }

  const updated = await folderQueries.update(id, { name });
  return Response.json({ folder: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folder = await folderQueries.findById(id);

  if (!folder || folder.user_id !== userId) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
  }

  await folderQueries.delete(id);
  return Response.json({ success: true });
}
