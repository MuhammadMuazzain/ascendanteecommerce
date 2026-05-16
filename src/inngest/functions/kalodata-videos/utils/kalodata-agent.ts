import { Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";

dotenv.config();

export interface ViralVideo {
  duration: string;
  sale: string;
  revenue: string;
  ad: number;
  create_time: string;
  content_type: string;
  gpm: number;
  description: string;
  id: string;
  views: string;
  url: string;
  edit_status?: "PENDING" | "EDITING" | "COMPLETED" | "FAILED";
  analysis?: {
    cuts: { from: number; to: number }[];
    suggested_hooks: string[];
    summary: string;
  };
}

export async function getViralVideos(productUrl: string): Promise<ViralVideo[]> {
  console.log("Initializing Stagehand agent with Browserbase...");

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    model: "google/gemini-2.5-flash",
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  });

  await stagehand.init();

  await stagehand.context.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  let page = stagehand.context.activePage();
  if (!page) {
    const pages = stagehand.context.pages();
    page = pages.length > 0 ? pages[0] : await stagehand.context.newPage();
  }

  if (!page) {
    throw new Error("Could not initialize Stagehand page.");
  }

  try {
    console.log("Navigating to Kalodata login...");
    await page.goto("https://www.kalodata.com/login", {
      waitUntil: "domcontentloaded",
      timeoutMs: 60000,
    });

    console.log("Waiting for login form...");
    await page.waitForSelector("#register_email", { timeout: 60000 });

    console.log("Entering credentials...");
    await stagehand.act(`type "athtik01@gmail.com" into the email field`);
    await stagehand.act(`type "David25d!" into the password field`);
    await stagehand.act(`click the button that says "Log in"`);

    console.log("Waiting for session to stabilize...");
    await page.waitForTimeout(5000);

    const urlObj = new URL(productUrl);
    const productId = urlObj.searchParams.get("id");

    if (!productId) {
      throw new Error("Product ID not found in URL");
    }

    console.log(`Analyzing product: ${productId}`);
    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeoutMs: 60000,
    });

    function formatDate(date: Date) {
      return date.toISOString().split("T")[0];
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 180);

    const dynamicDates = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };

    const enrichedResults = await page.evaluate(
      async (body) => {
        const response = await fetch("https://www.kalodata.com/product/detail/video/queryList", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json, text/plain, */*",
            origin: "https://www.kalodata.com",
            referer: window.location.href,
            country: "US",
            currency: "USD",
            language: "en-US",
          },
          body: JSON.stringify(body),
        });
        const queryListData = await response.json();

        let videoList = [];
        if (queryListData?.data?.list && Array.isArray(queryListData.data.list)) {
          videoList = queryListData.data.list;
        } else if (queryListData?.list && Array.isArray(queryListData.list)) {
          videoList = queryListData.list;
        } else if (Array.isArray(queryListData?.data)) {
          videoList = queryListData.data;
        } else if (Array.isArray(queryListData)) {
          videoList = queryListData;
        }

        if (videoList.length === 0) return [];

        const enrichedList = await Promise.all(
          videoList.map(async (video: any) => {
            try {
              const videoUrlResponse = await fetch(
                `https://www.kalodata.com/video/detail/getVideoUrl?videoId=${video.id}`,
                {
                  method: "GET",
                  headers: {
                    accept: "application/json, text/plain, */*",
                    country: "US",
                    currency: "USD",
                    language: "en-US",
                  },
                },
              );
              const videoUrlData = await videoUrlResponse.json();
              return {
                duration: video.duration || "0:00",
                sale: video.sale || "0",
                revenue: video.revenue || "$0",
                ad: video.ad ?? 0,
                create_time: video.create_time || "",
                content_type: video.content_type || "video",
                gpm: video.gpm || 0,
                description: video.description || "",
                id: video.id || "",
                views: video.views || "0",
                url: videoUrlData?.data?.url || null,
              };
            } catch (e) {
              return {
                duration: video.duration || "0:00",
                sale: video.sale || "0",
                revenue: video.revenue || "$0",
                ad: video.ad ?? 0,
                create_time: video.create_time || "",
                content_type: video.content_type || "video",
                gpm: video.gpm || 0,
                description: video.description || "",
                id: video.id || "",
                views: video.views || "0",
                url: null,
              };
            }
          }),
        );

        return enrichedList;
      },
      {
        id: productId,
        startDate: dynamicDates.startDate,
        endDate: dynamicDates.endDate,
        authority: true,
        pageNo: 1,
        pageSize: 10,
        sort: [{ field: "revenue", type: "DESC" }],
      },
    );

    return (enrichedResults as ViralVideo[]) || [];
  } catch (error) {
    console.error("Agent encountered an error:", error);
    throw error;
  } finally {
    await stagehand.close();
    console.log("Agent closed.");
  }
}
