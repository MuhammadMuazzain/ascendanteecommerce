import { fal } from "@fal-ai/client";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Running fal-ai/veo3.1/lite/image-to-video demo...");

  const result = await fal.subscribe("fal-ai/veo3.1/lite/image-to-video", {
    input: {
      prompt: "The subject turns to face the camera and smiles warmly.",
      image_url: "https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  console.log("Generation completed!");
  console.log("Result Data:", JSON.stringify(result.data, null, 2));
  console.log("Request ID:", result.requestId);
}

main().catch((error) => {
  console.error("Error running demo:", error);
  process.exit(1);
});
// Running fal-ai/veo3.1/lite/image-to-video demo...
// Generation completed!
// Result Data: {
//   "video": {
//     "url": "https://v3b.fal.media/files/b/0a973a1d/x1HIRCPAwqyMbMnmlBirA_1777d71ec1134e5c934a2ad8f86ac4f3.mp4",
//     "content_type": "video/mp4",
//     "file_name": "1777d71ec1134e5c934a2ad8f86ac4f3.mp4",
//     "file_size": 1916045
//   }
// }
