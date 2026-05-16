import { NextResponse } from "next/server";
import { kie } from "@/lib/kie";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { data, ok, status } = await kie.get1080pVideo(taskId);

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/kie/hd:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
