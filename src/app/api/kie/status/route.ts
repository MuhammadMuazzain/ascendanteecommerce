import { NextResponse } from "next/server";
import { kie } from "@/lib/kie";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const type = searchParams.get("type") || "veo"; // 'veo' or 'image'

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    let result;
    if (type === "image") {
      result = await kie.getImageStatus(taskId);
    } else {
      result = await kie.getVeoStatus(taskId);
    }

    const { data, ok, status } = result;

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/kie/status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
