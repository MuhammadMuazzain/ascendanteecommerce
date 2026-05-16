/**
 * Align ASR word timings to the known script so on-screen captions match dialogue.
 * Keeps start/end from transcription (or evenly splits when word counts differ).
 */
export function tokenizeScript(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  [key: string]: unknown;
};

export function alignTranscriptionWordsToScript(
  asrWords: TranscriptWord[],
  expectedText: string,
): TranscriptWord[] {
  const scriptTokens = tokenizeScript(expectedText);
  if (!scriptTokens.length || !asrWords.length) return asrWords;

  if (scriptTokens.length === asrWords.length) {
    return asrWords.map((w, i) => ({
      ...w,
      word: preserveTokenCasing(expectedText, scriptTokens[i], i),
    }));
  }

  const totalStart = asrWords[0].start;
  const totalEnd = asrWords[asrWords.length - 1].end;
  const span = Math.max(totalEnd - totalStart, 0.001);

  return scriptTokens.map((token, i) => {
    const start = totalStart + (span * i) / scriptTokens.length;
    const end =
      i === scriptTokens.length - 1
        ? totalEnd
        : totalStart + (span * (i + 1)) / scriptTokens.length;
    const anchorIdx = Math.min(
      asrWords.length - 1,
      Math.floor((i / scriptTokens.length) * asrWords.length),
    );
    return {
      ...asrWords[anchorIdx],
      word: preserveTokenCasing(expectedText, token, i),
      start,
      end,
    };
  });
}

/** Use script casing when the token exists at the same index in the raw script. */
function preserveTokenCasing(expectedText: string, normalizedToken: string, index: number): string {
  const rawTokens = expectedText.trim().split(/\s+/).filter(Boolean);
  if (rawTokens[index]) {
    return rawTokens[index];
  }
  return normalizedToken;
}

export function applyScriptToTranscriptResult(
  result: { results?: { main?: { words?: TranscriptWord[]; text?: string } } },
  expectedText?: string,
): void {
  const main = result.results?.main;
  if (!expectedText?.trim() || !main?.words?.length) return;

  const aligned = alignTranscriptionWordsToScript(main.words, expectedText);
  main.words = aligned;
  main.text = aligned.map((w) => w.word).join(" ");
}
