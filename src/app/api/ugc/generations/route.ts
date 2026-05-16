import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sql } from "kysely";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const segmentId = searchParams.get("segmentId");
    const schemaId = searchParams.get("schemaId");

    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = db
      .selectFrom("generations")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", "COMPLETED") // Only show successful ones for now
      .orderBy("created_at", "desc");

    if (segmentId) {
      // Use sql template for JSONB filtering as Kysely's where might not handle direct JSON access cleanly for all drivers
      query = query.where(sql`metadata->>'segmentId'`, "=", segmentId);
    }

    if (schemaId) {
      query = query.where(sql`metadata->>'schemaId'`, "=", schemaId);
    }

    const generations = await query.execute();

    return NextResponse.json({ generations });
  } catch (error: any) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
