import { getInngestApp } from "@/inngest";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

  // Determine if it's a full scheme or just params
  // const isParams = !payload.scheme?.segments;
  let scheme = payload.scheme;

  const existingScheme = await db
    .selectFrom("generations")
    .selectAll()
    .where("id", "=", scheme.id)
    .executeTakeFirst();

  if (!existingScheme) {
    return Response.json({ error: "Scheme not found" }, { status: 404 });
  }

  await inngest.send({
    name: "schema/lipsync",
    data: { scheme },
  });

  return Response.json({
    ok: true,
    id: scheme.id,
  });
}
