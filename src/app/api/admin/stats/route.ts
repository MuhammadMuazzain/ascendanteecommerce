import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "kysely";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalGenerations,
    totalProjects,
    completedGenerations,
    failedGenerations,
    recentUsers,
    recentGenerations,
  ] = await Promise.all([
    db.selectFrom("user").select(db.fn.count("id").as("count")).executeTakeFirst(),
    db.selectFrom("generations").select(db.fn.count("id").as("count")).executeTakeFirst(),
    db.selectFrom("projects").select(db.fn.count("id").as("count")).executeTakeFirst(),
    db
      .selectFrom("generations")
      .select(db.fn.count("id").as("count"))
      .where("status", "=", "COMPLETED")
      .executeTakeFirst(),
    db
      .selectFrom("generations")
      .select(db.fn.count("id").as("count"))
      .where("status", "=", "FAILED")
      .executeTakeFirst(),
    // Users registered per day (last 30 days)
    db
      .selectFrom("user")
      .select([db.fn.count("id").as("count"), sql<string>`DATE(created_at)`.as("date")])
      .where("created_at", ">=", thirtyDaysAgo)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`, "asc")
      .execute(),
    // Generations per day (last 30 days)
    db
      .selectFrom("generations")
      .select([db.fn.count("id").as("count"), sql<string>`DATE(created_at)`.as("date")])
      .where("created_at", ">=", thirtyDaysAgo)
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`, "asc")
      .execute(),
  ]);

  return NextResponse.json({
    totalUsers: Number(totalUsers?.count ?? 0),
    totalGenerations: Number(totalGenerations?.count ?? 0),
    totalProjects: Number(totalProjects?.count ?? 0),
    completedGenerations: Number(completedGenerations?.count ?? 0),
    failedGenerations: Number(failedGenerations?.count ?? 0),
    recentUsers,
    recentGenerations,
  });
}
