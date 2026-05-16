import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const url =
  "https://cdn.scenify.io/ugc-videos/I9OnjksVvvfc9a6fz0IDL/I9OnjksVvvfc9a6fz0IDL-seg-2/trimmed-ttwt-7Zod0dc0s8ohUMzF.mp4";

async function main() {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    console.error("DEEPGRAM_API_KEY is not set in .env");
    process.exit(1);
  }

  const deepgram = createClient(deepgramApiKey);

  console.log("Transcribing URL:", url);

  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url },
    {
      model: "nova-3",
      smart_format: true,
      utterances: true,
      punctuate: true,
    },
  );

  if (error) {
    console.error("Deepgram Error:", error);
    process.exit(1);
  }

  if (!result) {
    console.error("No result from Deepgram");
    process.exit(1);
  }

  console.log("Transcription successful!");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
