import { NextRequest, NextResponse } from "next/server";
import { VideoGenerator } from "@/lib/video-generation";
import { config } from "@/inngest/config";
import { db } from "@/lib/database";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const videoGenerator = new VideoGenerator({
      provider: "veo",
      params: {
        geminiApiKey: config.gemini.key,
      },
    });

    const data = await videoGenerator.getStatus(taskId);

    if (data.status === "COMPLETED" || data.status === "FAILED") {
      const status: "COMPLETED" | "FAILED" = data.status === "COMPLETED" ? "COMPLETED" : "FAILED";
      const url = data.videos?.[0] || "";

      await db
        .updateTable("generations")
        .set({
          status,
          output: url ? JSON.stringify({ url }) : undefined,
          updated_at: new Date(),
        })
        .where("id", "=", taskId)
        .execute();
    }

    // Adapt to local successFlag format for frontend compatibility if needed
    // or just return the data. Frontend in video-customization.tsx checks successFlag.
    const response = {
      successFlag: data.status === "COMPLETED" ? 1 : data.status === "FAILED" ? 2 : 0,
      resultUrls: data.videos ? JSON.stringify(data.videos) : undefined,
      status: data.status,
      taskId: data.id,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in /api/ugc/video-status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
