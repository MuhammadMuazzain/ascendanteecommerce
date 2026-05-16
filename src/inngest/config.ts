export const config = {
  inngest: {
    signingKey: process.env.INNGEST_SIGNING_KEY as string,
    eventKey: process.env.INNGEST_EVENT_KEY as string,
  },
  scraper: {
    workerUrl: process.env.SCRAPER_WORKER_URL as string,
  },
  freepik: {
    url: process.env.FREEPIK_API_BASE_URL || "https://api.freepik.com/v1/ai",
    key: process.env.FREEPICK_API_KEY as string,
    nanoModel: process.env.FREEPICK_NANO_MODEL || "gemini-2-5-flash-image-preview",
  },
  pexels: {
    url: process.env.PEXELS_URL || "https://api.pexels.com",
    key: process.env.PEXELS_API_KEY as string,
  },
  openai: {
    key: process.env.OPENAI_API_KEY as string,
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  },
  pixVerse: {
    resolution: process.env.PIXVERSE_RESOLUTION || "720p",
  },
  elevenLabs: {
    url: process.env.ELEVENLABS_URL || "https://api.elevenlabs.io",
    key: process.env.ELEVENLABS_API_KEY as string,
    model: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
    workerUrl: process.env.ELEVENLABS_WORKER_URL as string,
  },
  deepgram: {
    url: process.env.DEEPGRAM_URL || "https://api.deepgram.com/v1",
    model: process.env.DEEPGRAM_MODEL || "nova-2",
    key: process.env.DEEPGRAM_API_KEY as string,
  },
  gemini: {
    key: process.env.GOOGLE_GENERATIVE_AI_API_KEY as string,
    model2: process.env.GEMINI_2_MODEL || "gemini-2.5-flash",
    imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview",
  },
  r2: {
    bucket: process.env.R2_BUCKET_NAME as string,
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    accountId: process.env.R2_ACCOUNT_ID as string,
    cdn: process.env.R2_PUBLIC_DOMAIN as string,
  },
  upstash: {
    url: process.env.UPSTASH_REDIS_REST_URL as string,
    token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
  },
  pixabay: {
    url: "https://pixabay.com/api",
    key: process.env.PIXABAY_API_KEY as string,
  },
  phonos: {
    token: process.env.PHONOS_TOKEN as string,
  },
  fal: {
    key: process.env.FAL_KEY as string,
  },
};
