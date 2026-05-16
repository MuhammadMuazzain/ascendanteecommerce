import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete user data in transaction
    await db.transaction().execute(async (trx) => {
      // Find all projects belonging to user
      const userProjects = await trx
        .selectFrom("projects")
        .select("id")
        .where("user_id", "=", userId)
        .execute();

      const projectIds = userProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        // Delete segments for these projects
        await trx.deleteFrom("segments").where("project_id", "in", projectIds).execute();

        // Delete schemas for these projects
        await trx.deleteFrom("schemas").where("project_id", "in", projectIds).execute();
      }

      // Delete scenes
      await trx.deleteFrom("scenes").where("user_id", "=", userId).execute();

      // Delete assets
      await trx.deleteFrom("assets").where("user_id", "=", userId).execute();

      // Delete generations
      await trx.deleteFrom("generations").where("user_id", "=", userId).execute();

      // Delete projects
      await trx.deleteFrom("projects").where("user_id", "=", userId).execute();
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting projects data:", error);
    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 });
  }
}
