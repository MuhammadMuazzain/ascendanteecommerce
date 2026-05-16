import { NextRequest, NextResponse } from "next/server";
import { kie } from "@/lib/kie";
import { db } from "@/lib/database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    // 1. Check local database first for the generation status
    const generation = await db
      .selectFrom("generations")
      .selectAll()
      .where("id", "=", taskId)
      .executeTakeFirst();

    if (generation) {
      const status = generation.status as string;
      const state = status === "COMPLETED" ? "success" : status === "FAILED" ? "failed" : "pending";

      if (status === "COMPLETED" || status === "FAILED") {
        const output =
          typeof generation.output === "string"
            ? JSON.parse(generation.output)
            : (generation.output as any);

        return NextResponse.json({
          state,
          url: output?.url || output?.imageUrl,
          failMsg: status === "FAILED" ? "Generation failed" : undefined,
          // Add other fields if needed by the hook
        });
      }
      // If it's PENDING in DB, we still might want to check KIE if it was a KIE task
    }

    // 2. Fallback to KIE for ongoing or external tasks
    const { data, ok } = await kie.getImageStatus(taskId);

    if (!ok) {
      return NextResponse.json({ error: "Failed to fetch status from KIE" }, { status: 500 });
    }

    const taskData = data.data;
    const state = taskData?.state?.toLowerCase();

    // If task has finished, update the database
    if (
      state === "success" ||
      state === "completed" ||
      state === "finished" ||
      state === "failed" ||
      state === "error"
    ) {
      let status: "COMPLETED" | "FAILED" =
        state === "failed" || state === "error" ? "FAILED" : "COMPLETED";
      let url = "";

      if (status === "COMPLETED") {
        if (taskData?.resultJson) {
          try {
            const result = JSON.parse(taskData.resultJson);
            url = result.resultUrls?.[0] || result.imageUrl || result.url;
          } catch (e) {
            console.error(`Failed to parse resultJson for ${taskId}:`, e);
          }
        }
        if (!url) url = taskData?.url || taskData?.imageUrl;
      }

      await db
        .updateTable("generations")
        .set({
          status,
          output: url ? { url } : undefined,
          updated_at: new Date(),
        })
        .where("id", "=", taskId)
        .execute();
    }

    return NextResponse.json(taskData);
  } catch (error: any) {
    console.error("Error in /api/ugc/frame-status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
