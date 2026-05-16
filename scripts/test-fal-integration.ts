import { VideoGenerator } from "../src/lib/video-generation";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function saveVideo(url: string, filename: string) {
  if (url.startsWith("data:")) {
    const base64Data = url.split(",")[1];
    fs.writeFileSync(filename, Buffer.from(base64Data, "base64"));
  } else {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filename, Buffer.from(buffer));
  }
  console.log(`[File] Saved video to: ${filename}`);
}

async function main() {
  console.log("Testing FalVeoProvider via VideoGenerator factory...");

  // if (!process.env.FAL_KEY) {
  //   console.error("FAL_KEY is not set in .env");
  //   process.exit(1);
  // }

  // 1. Test Lite Model (Explicitly specified)
  const videoGenerator = new VideoGenerator({
    provider: "veo",
    params: {
      geminiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    },
  });
  // console.log("\n--- 1. Testing Lite Image-to-Video (Failing Case with Auto-Fix) ---");
  // try {
  //   const result = await (liteGenerator as any).create({
  //     prompt: `SCRIPT: "because you're actually teaching your body how to produce more energy."\nClear studio voiceover, clean audio track, pure isolated speech.\nDELIVERY: Confident, fluent delivery with smooth, continuous speech and natural professional cadence. NO hesitation, NO stumbled words, NO filler words, NO vocal clutter. STICKLY FORBIDDEN: 'um', 'uh', 'er', 'ah', 'meh', 'hmm', or any other non-script sounds. Subject must deliver the SCRIPT exactly as written with perfect professional articulation.\nACTION:  Subject speaks directly to camera with highly accurate articulation. A medium close-up shot of a young woman with brown hair, freckles, and a grey sweater speaking naturally to the camera. While she says, "because you're actually teaching your body how to produce more energy," she maintains direct eye contact, making subtle expressive hand gestures to emphasize her points. The camera style is a natural handheld smartphone aesthetic.. Perfect audio-visual alignment, highly expressive and dynamic lip-sync that exactly matches the spoken words. Mouth rests naturally closed only when audio ceases.\nSCENE: Warmly lit study, natural window light, handheld smartphone aesthetic.`,
  //     negativePrompt:
  //       "text, captions, overlays, on-screen graphics, subtitles, zoom, camera transitions, visual effects, blurred, low quality, distorted features.",
  //     style: "cinematic",
  //     firstFrameUrl: "https://cdn.scenify.io/VIDEOS/avatars/pvu9kZNDke.png",
  //     aspectRatio: "9:16",
  //     durationSeconds: 4,
  //     autoFix: true,
  //   });
  //   console.log("Lite I2V Success:", result);
  // } catch (error: any) {
  //   console.error("Lite I2V Failed:", error);
  //   if (error.body) {
  //     console.error("Error Body:", JSON.stringify(error.body, null, 2));
  //   }
  // }

  // // 2. Test Smart Model Selection (Automatic upgrade to First-Last Frame)
  // console.log("\n--- 2. Testing Smart Upgrade to First-Last Frame ---");
  // try {
  //   const result = await liteGenerator.create({
  //     prompt: "A smooth transition between the two frames.",
  //     style: "cinematic",
  //     firstFrameUrl:
  //       "https://storage.googleapis.com/falserverless/example_inputs/veo31-flf2v-input-1.jpeg",
  //     lastFrameUrl:
  //       "https://storage.googleapis.com/falserverless/example_inputs/veo31-flf2v-input-2.jpeg",
  //     aspectRatio: "16:9",
  //     durationSeconds: 8,
  //   });
  //   console.log("Smart FLF2V Success:", result);
  // } catch (error) {
  //   console.error("Smart FLF2V Failed:", error);
  // }

  // 3. Test Reference-to-Video
  console.log("\n--- 3. Testing Reference-to-Video ---");
  const sixSecs =
    "I see a lot of misinformation going around about methylene blue, so let's clear up a couple of things.";
  const eightSecs =
    "Myth number one is that methylene blue is just a stimulant. It's actually not because it doesn't stimulate your body or your brain the way caffeine does";
  const fourSecs = "because you're actually teaching your body how to produce more energy.";
  // try {
  //   const result = await videoGenerator.create({
  //     prompt: `SCRIPT: "I see a lot of misinformation going around about methylene blue, so let's clear up a couple of things. Mhm. Yeah, exactly."\nClear studio voiceover, clean audio track, pure isolated speech.\nDELIVERY: Confident, fluent delivery with smooth, continuous speech and natural professional cadence. NO hesitation, NO stumbled words, NO filler words, NO vocal clutter. STICKLY FORBIDDEN: 'um', 'uh', 'er', 'ah', 'meh', 'hmm', or any other non-script sounds. Subject must deliver the SCRIPT exactly as written with perfect professional articulation.\nACTION: Scale: palm-sized small bottle.  Subject speaks directly to camera with highly accurate articulation. [product_reveal] The young woman with light brown hair tied back and a grey v-neck knit sweater reaches forward to the desk, picks up the closed navy blue stand-up pouch of METHYLENE BLUE GUMMIES from image_0.png with bold white text 'METHYLENE BLUE GUMMIES' and a molecular graphic, and brings it up to chest height [product_in_hand] while continuing to speak directly to the camera.. Perfect audio-visual alignment, highly expressive and dynamic lip-sync that exactly matches the spoken words. Mouth rests naturally closed only when audio ceases.\nSCENE: Bright home office with natural window light, warm environment, handheld UGC smartphone video aesthetic.`,
  //     negativePrompt:
  //       "text, captions, overlays, on-screen graphics, subtitles, zoom, camera transitions, visual effects, blurred, low quality, distorted features.",
  //     style: "cinematic",
  //     referenceImageUrls: [
  //       "https://cdn.scenify.io/VIDEOS/avatars/pvu9kZNDke.png",
  //       "https://cdn.scenify.io/assets/product-clean-R4XaiWzSs4lp4aDuLSXyY.png",
  //       "https://cdn.scenify.io/assets/product-clean-h0o819RZ_6lrBnXENP9gl.png",
  //     ],
  //     aspectRatio: "9:16",
  //     durationSeconds: 8,
  //   });
  //   console.log("Reference-to-Video Success:", result);
  //   const finalUrl = typeof result === "string" ? result : result.url;
  //   await saveVideo(finalUrl, "test-veo-reference.mp4");
  // } catch (error) {
  //   console.error("Reference-to-Video Failed:", error);
  // }

  // 4. Test First-Last Frame (Interpolation)

  const DELIVERY_CONTROL =
    "Confident, fluent delivery with smooth, continuous speech and natural professional cadence. NO hesitation, NO stumbled words, NO filler words, NO vocal clutter. STICKLY FORBIDDEN: 'um', 'uh', 'er', 'ah', 'meh', 'hmm', or any other non-script sounds. Subject must deliver the SCRIPT exactly as written with perfect professional articulation.";

  console.log("\n--- 4. Testing First-Last Frame Interpolation ---");
  try {
    const result = await (videoGenerator as any).create({
      prompt: `
      AUDIO DIALOGUE (SPOKEN ONLY): "${eightSecs}"
      DELIVERY: ${DELIVERY_CONTROL}
      `,
      style: "cinematic",
      firstFrameUrl: "https://cdn.scenify.io/VIDEOS/avatars/pvu9kZNDke.png",
      lastFrameUrl: "https://cdn.scenify.io/VIDEOS/avatars/pvu9kZNDke.png",
      aspectRatio: "9:16",
      durationSeconds: 8,
    });
    console.log("First-Last Frame Success:", result);
    const finalUrl = typeof result === "string" ? result : result.url;
    await saveVideo(finalUrl, "test-veo-8s.mp4");
  } catch (error: any) {
    console.error("First-Last Frame Failed:", error);
    if (error.body) {
      console.error("Error Body:", JSON.stringify(error.body, null, 2));
    }
  }

  // 5. Test Different Durations (4, 6)
  console.log("\n--- 5. Testing 4s and 6s Durations (Lite I2V) ---");
  for (const duration of [4, 6]) {
    console.log(`\nTesting ${duration}s...`);
    const script = duration === 4 ? fourSecs : sixSecs;
    try {
      const result = await (videoGenerator as any).create({
        prompt: `
        AUDIO DIALOGUE (SPOKEN ONLY): "${script}"\nA professional avatar speaking naturally.
        DELIVERY: ${DELIVERY_CONTROL}`,
        style: "cinematic",
        firstFrameUrl: "https://cdn.scenify.io/VIDEOS/avatars/pvu9kZNDke.png",
        lastFrameUrl: "https://cdn.scenify.io/VIDEOS/avatars/pvu9kZNDke.png",
        aspectRatio: "9:16",
        durationSeconds: duration,
      });
      console.log(`${duration}s Success:`, result);
      const finalUrl = typeof result === "string" ? result : result.url;
      await saveVideo(finalUrl, `test-veo-${duration}s.mp4`);
    } catch (error: any) {
      console.error(`${duration}s Failed:`, error);
    }
  }
}

main().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
