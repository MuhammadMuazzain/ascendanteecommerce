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
      // Delete user's subscriptions
      await trx.deleteFrom("subscription").where("user_id", "=", userId).execute();

      // Delete user's social accounts
      await trx.deleteFrom("user_social_accounts").where("user_id", "=", userId).execute();

      // Delete user's projects
      await trx.deleteFrom("projects").where("user_id", "=", userId).execute();

      // Delete user's folders
      await trx.deleteFrom("folders").where("user_id", "=", userId).execute();

      // Delete user's scenes
      await trx.deleteFrom("scenes").where("user_id", "=", userId).execute();

      // Delete user's generations
      await trx.deleteFrom("generations").where("user_id", "=", userId).execute();

      // Delete user's sessions
      await trx.deleteFrom("session").where("user_id", "=", userId).execute();

      // Delete user's accounts (OAuth connections)
      await trx.deleteFrom("account").where("user_id", "=", userId).execute();

      // Finally, delete the user
      await trx.deleteFrom("user").where("id", "=", userId).execute();
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
