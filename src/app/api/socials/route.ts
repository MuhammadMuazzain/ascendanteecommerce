import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/database";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    //const { searchParams } = new URL(req.url);
    //const userId = searchParams.get("userId");

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let account_socials = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("is_active", "=", true)
      .execute();

    const socials = {
      instagram: false,
      tiktok: false,
      youtube: false,
      google_drive: false,
    };

    const ig = account_socials.find((as) => as.provider === "INSTAGRAM");
    if (ig) socials.instagram = true;

    const tiktok = account_socials.find((as) => as.provider === "TIKTOK");
    if (tiktok) socials.tiktok = true;

    const youtube = account_socials.find((as) => as.provider === "YOUTUBE");
    if (youtube) socials.youtube = true;

    const googleDrive = account_socials.find((as) => as.provider === "GOOGLE_DRIVE");
    if (googleDrive) socials.google_drive = true;

    return NextResponse.json({ socials }, { status: 200 });
  } catch (error) {
    console.error("Validate social error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed validate social error.", details: errorMessage },
      { status: 500 },
    );
  }
}
