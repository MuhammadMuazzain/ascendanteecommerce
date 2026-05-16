import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  let query = db
    .selectFrom("generations")
    .leftJoin("user", "user.id", "generations.user_id")
    .select([
      "generations.id",
      "generations.status",
      "generations.progress",
      "generations.preview_url",
      "generations.created_at",
      "generations.updated_at",
      "user.email as user_email",
      "user.name as user_name",
    ])
    .orderBy("generations.created_at", "desc");

  let countQuery = db.selectFrom("generations").select(db.fn.count("id").as("count"));

  if (status) {
    query = query.where("generations.status", "=", status as any);
    countQuery = countQuery.where("status", "=", status as any);
  }

  const [generations, countResult] = await Promise.all([
    query.limit(limit).offset(offset).execute(),
    countQuery.executeTakeFirst(),
  ]);

  return NextResponse.json({
    generations,
    total: Number(countResult?.count ?? 0),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult?.count ?? 0) / limit),
  });
}
