import { NextResponse } from "next/server";
import { getInngestApp } from "@/inngest";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { ResolverStatus } from "@/utils/enum";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productUrl } = await req.json();

    if (!productUrl) {
      return NextResponse.json({ error: "Product URL is required" }, { status: 400 });
    }

    const generationId = nanoid();

    // 1. Create generation record
    await db
      .insertInto("generations")
      .values({
        id: generationId,
        user_id: session.user.id,
        status: ResolverStatus.PENDING,
        input: JSON.stringify({ productUrl }),
        metadata: JSON.stringify({ type: "kalodata-videos" }),
      })
      .execute();

    // 2. Trigger Inngest
    const inngest = getInngestApp();
    await inngest.send({
      name: "kalodata-videos/analyze",
      data: {
        generationId,
        productUrl,
      },
    });

    return NextResponse.json({ generationId });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
