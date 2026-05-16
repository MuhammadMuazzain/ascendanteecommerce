import { OpenAITranscription } from "@/lib/transcribe";

import { globalSemaphore } from "../services/semaphore";

export async function safeUpstashCall<T>(fn: () => Promise<T>): Promise<T> {
  const release = await globalSemaphore.acquire();
  try {
    return await fn();
  } finally {
    await release();
  }
}

// Channel helper — one channel per workflow run, scoped by schemeId
export const workflowChannel = (schemeId: string) => `workflow:${schemeId}`;

const fixed = (num: number) => {
  return Number(num.toFixed(3));
};

export const convertSecondsToMs = (seconds: number) => Number((seconds * 1000).toFixed(3));

export const convertMsToSeconds = (ms: number) => Number((ms / 1000).toFixed(5));

export function buildMiniTranscribe(data: OpenAITranscription, duration: number) {
  const text = data.transcript.map((w) => w.word).join(" ");
  return {
    duration: fixed(duration / 1000),
    results: {
      main: {
        language: {},
        paragraphs: [
          {
            sentences: [
              {
                text,
                start: 0,
                end: fixed(duration / 1000),
              },
            ],
            numWords: data.transcript.length,
            start: 0,
            end: fixed(duration / 1000),
          },
        ],
        text,
        words: data.transcript.map((w) => ({
          ...w,
          start: fixed(w.start_time),
          end: fixed(w.end_time),
        })),
      },
    },
  };
}
