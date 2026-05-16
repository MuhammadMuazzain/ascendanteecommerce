import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body.role !== "string" || !["editor", "viewer", "guest"].includes(body.role)) {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  }

  await db.updateTable("user").set({ role: body.role }).where("id", "=", id).execute();

  return NextResponse.json({ success: true, role: body.role });
}
