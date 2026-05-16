import { scrapeUrl } from "../../src/inngest/functions/scrap-to-url/services/scraper";

async function test() {
  const url = "https://feastables.com/";
  //const url = 'https://teamtrees.org/';
  console.log(`Testing scraper with URL: ${url}`);

  try {
    const data = await scrapeUrl(url);
    console.log("Scrape successful!");
    console.log("Title:", data.title);
    console.log("Images found:", data.media.images.length);
    console.log("Images:", data.media.images);
    console.log("Videos found:", data.media.videos.length);
    console.log("Videos:", data.media.videos);
    process.exit(0);
  } catch (error) {
    console.error("Scrape failed:", error);
    process.exit(1);
  }
}

test();
