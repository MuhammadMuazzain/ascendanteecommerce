import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { folderQueries } from "@/lib/database/folder-queries";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders = await folderQueries.findByUserId(userId);
  return Response.json({ folders });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return Response.json({ error: "Folder name is required" }, { status: 400 });
  }

  const folder = await folderQueries.create({
    id: nanoid(),
    name,
    user_id: userId,
  });

  return Response.json({ folder }, { status: 201 });
}
