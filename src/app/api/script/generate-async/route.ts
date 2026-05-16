import { getInngestApp } from "@/inngest";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { ResolverStatus } from "@/utils/enum";

/**
 * Async Script Generation Trigger
 *
 * Creates a generation record and triggers the background Inngest task.
 */
export async function POST(req: Request) {
  try {
    const inngest = getInngestApp();
    const body = await req.json();
    const {
      message,
      imageUrls,
      schemaId,
      previousSchema,
      productName,
      productDescription,
      visualStyle,
      scriptTone,
      mode = "character-driven-ad",
    } = body;

    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use provided schemaId or generate a new one
    const generationId = schemaId || nanoid();

    // 1. Ensure a generation record exists to track status
    const existing = await db
      .selectFrom("generations")
      .select("id")
      .where("id", "=", generationId)
      .executeTakeFirst();

    if (!existing) {
      await db
        .insertInto("generations")
        .values({
          id: generationId,
          status: ResolverStatus.PENDING,
          user_id: userId,
          input: previousSchema || {},
          metadata: { message: "Initializing AI script generation..." },
        } as any)
        .execute();
    } else {
      await db
        .updateTable("generations")
        .set({
          status: ResolverStatus.PENDING,
          metadata: { message: "Starting new AI refinement..." },
        })
        .where("id", "=", generationId)
        .execute();
    }

    // 2. Trigger the correct mode-specific Inngest function
    const eventMapping: Record<string, string> = {
      "character-driven-ad": "character-ad/script.request",
      "narrative-video": "narrative/script.request",
      "product-video-ad": "product/script.request",
      "ugc-video-ad": "ugc/script.request",
      "fake-ugc-video-ad": "fake-ugc/script.request",
    };

    const eventName = eventMapping[mode as string] || "script/generate.request";

    await inngest.send({
      name: eventName,
      data: {
        message,
        imageUrls,
        schemaId: generationId,
        previousSchema,
        productName,
        productDescription,
        visualStyle,
        scriptTone,
      },
    });

    return Response.json({
      ok: true,
      generationId,
      message: "Generation triggered successfully",
    });
  } catch (err) {
    console.error("[api/script/generate-async]", err);
    const message =
      err instanceof Error ? err.message : "Failed to trigger script generation";
    const hint =
      process.env.NODE_ENV === "development" &&
      typeof message === "string" &&
      (message.includes("fetch failed") ||
        message.includes("ECONNREFUSED") ||
        message.includes("ECONNRESET"))
        ? " Is the Inngest dev server running? Try: npx inngest-cli dev"
        : "";
    return Response.json({ error: `${message}${hint}` }, { status: 500 });
  }
}
