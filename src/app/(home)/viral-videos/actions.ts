"use server";

import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getGeneration(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const generation = await db
    .selectFrom("generations")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", session.user.id)
    .executeTakeFirst();

  return generation;
}
