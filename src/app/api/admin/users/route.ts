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
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const offset = (page - 1) * limit;

  let query = db
    .selectFrom("user")
    .leftJoin("subscription", "subscription.user_id", "user.id")
    .select([
      "user.id",
      "user.email",
      "user.name",
      "user.image",
      "user.role",
      "user.email_verified",
      "user.created_at",
      "subscription.plan",
      "subscription.credits",
      "subscription.status as subscription_status",
    ])
    .orderBy("user.created_at", "desc");

  let countQuery = db.selectFrom("user").select(db.fn.count("id").as("count"));

  if (search) {
    query = query.where((eb) =>
      eb.or([eb("user.email", "ilike", `%${search}%`), eb("user.name", "ilike", `%${search}%`)]),
    );
    countQuery = countQuery.where((eb) =>
      eb.or([eb("email", "ilike", `%${search}%`), eb("name", "ilike", `%${search}%`)]),
    );
  }

  const [users, countResult] = await Promise.all([
    query.limit(limit).offset(offset).execute(),
    countQuery.executeTakeFirst(),
  ]);

  return NextResponse.json({
    users,
    total: Number(countResult?.count ?? 0),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult?.count ?? 0) / limit),
  });
}
