import { NextResponse } from "next/server";
import { kie } from "@/lib/kie";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { data, ok, status } = await kie.getImageStatus(taskId);

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    // Parse and normalize the response
    let normalizedResponse: any = {
      status: data.data?.state?.toUpperCase() || "PENDING",
      taskId: data.data?.taskId,
    };

    // Parse resultJson if available
    if (data.data?.resultJson) {
      try {
        const result = JSON.parse(data.data.resultJson);
        if (result.resultUrls && result.resultUrls.length > 0) {
          normalizedResponse.output = {
            image_url: result.resultUrls[0],
          };
        }
      } catch (e) {
        console.error("Failed to parse resultJson:", e);
      }
    }

    // Include failure information if present
    if (data.data?.failMsg) {
      normalizedResponse.error = data.data.failMsg;
    }

    return NextResponse.json(normalizedResponse, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/avatar/status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
