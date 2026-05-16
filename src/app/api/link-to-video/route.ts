import { getInngestApp } from "@/inngest";
import { db } from "@/lib/database";
import { sql } from "kysely";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projectQueries } from "@/lib/database/project-queries";
import { folderQueries } from "@/lib/database/folder-queries";

import { nanoid } from "nanoid";
import { aspectRatioType, ResolverStatus } from "@/utils/enum";

export async function POST(req: Request) {
  const inngest = getInngestApp();

  const payload = await req.json();

  // Get authenticated user
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id || null;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!payload.url) {
    return Response.json({ error: "url is mandatory" }, { status: 404 });
  }

  const schemeId = nanoid();
  const requestedFolderId: string | null = payload?.folderId || null;

  // Validate folderId if provided
  let folderId: string | null = null;
  if (requestedFolderId) {
    const folder = await folderQueries.findById(requestedFolderId);
    if (!folder || folder.user_id !== userId) {
      return Response.json({ error: "Folder not found or access denied" }, { status: 404 });
    }
    folderId = requestedFolderId;
  }

  // Save generation with userId
  // Database column is user_id (snake_case), but TypeScript types use userId (camelCase)
  // Use type assertion to allow user_id column name
  await db
    .insertInto("generations")
    .values({
      id: schemeId,
      input: {},
      output: sql`'[]'::jsonb`,
      user_id: userId, // Use actual database column name
      status: ResolverStatus.PENDING,
      metadata: {
        link_to_video: payload.url,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })
    .returningAll()
    .executeTakeFirst();

  // Create project for this generation
  const projectId = nanoid();
  await projectQueries.create({
    id: projectId,
    name: `Project ${schemeId.slice(0, 8)}`,
    scene_id: null, // Will be set when scene is created
    folder_id: folderId,
    user_id: userId,
    generation_id: schemeId,
    thumbnail: null,
    public: payload.public !== undefined ? payload.public : true, // Default to public
    type: "link-to-video",
  });

  await inngest.send({
    name: "link/video",
    data: {
      schemeId,
      projectId,
      userId,
      url: payload.url,
      aspectRatio: payload.aspectRatio || aspectRatioType.NINE_SIXTEEN,
      visualStyle:
        payload.visualStyle ||
        "A style that closely mimics the visual appearance of reality, focusing on accuracy and detail.", //realism
    },
  });

  return Response.json({
    ok: true,
    id: schemeId,
    projectId,
  });
}
