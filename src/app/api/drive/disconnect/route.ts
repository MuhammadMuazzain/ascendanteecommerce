import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .deleteFrom("user_social_accounts")
      .where("user_id", "=", userId)
      .where("provider", "=", "GOOGLE_DRIVE")
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect Google Drive error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to disconnect Google Drive", details: errorMessage },
      { status: 500 },
    );
  }
}
