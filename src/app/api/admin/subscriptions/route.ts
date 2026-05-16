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
  const plan = searchParams.get("plan") || "";
  const offset = (page - 1) * limit;

  let query = db
    .selectFrom("subscription")
    .leftJoin("user", "user.id", "subscription.user_id")
    .select([
      "subscription.id",
      "subscription.plan",
      "subscription.status",
      "subscription.credits",
      "subscription.period_start",
      "subscription.period_end",
      "subscription.stripe_subscription_id",
      "subscription.created_at",
      "user.email as user_email",
      "user.name as user_name",
    ])
    .orderBy("subscription.created_at", "desc");

  let countQuery = db.selectFrom("subscription").select(db.fn.count("id").as("count"));

  if (plan) {
    query = query.where("subscription.plan", "ilike", `%${plan}%`);
    countQuery = countQuery.where("plan", "ilike", `%${plan}%`);
  }

  const [subscriptions, countResult] = await Promise.all([
    query.limit(limit).offset(offset).execute(),
    countQuery.executeTakeFirst(),
  ]);

  return NextResponse.json({
    subscriptions,
    total: Number(countResult?.count ?? 0),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult?.count ?? 0) / limit),
  });
}
