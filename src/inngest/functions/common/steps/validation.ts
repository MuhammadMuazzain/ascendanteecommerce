import { db } from "@/lib/database";
import { ResolverStatus } from "@/utils/enum";

export const validateUserId = async (
  schemeId: string,
): Promise<{ userId: string | null; projectId: string | null }> => {
  try {
    const generation = await db
      .selectFrom("generations")
      .select("user_id")
      .where("id", "=", schemeId)
      .executeTakeFirst();

    const userId = generation?.user_id || null;
    let projectId: string | null = null;

    if (userId) {
      const project = await db
        .selectFrom("projects")
        .select("id")
        .where("generation_id", "=", schemeId)
        .executeTakeFirst();
      projectId = project?.id || null;
    }

    await db
      .updateTable("generations")
      .set({ status: ResolverStatus.PROGRESS, progress: 1.5 })
      .where("id", "=", schemeId)
      .execute();

    return { userId, projectId };
  } catch (err) {
    console.error("Validation and preprocessing error:", err);
    throw new Error("Validation preprocessing failed unexpectedly");
  }
};
