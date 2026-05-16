import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/database";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("is_active", "=", true)
      .where("provider", "=", "YOUTUBE")
      .executeTakeFirst();

    if (socialAccount) {
      await db
        .updateTable("user_social_accounts")
        .set({ is_active: false })
        .where("id", "=", socialAccount.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Youtube disconnect error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to disconnect Youtube.", details: errorMessage },
      { status: 500 },
    );
  }
}
