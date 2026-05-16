// For Business plan
export const ELEVEN_LABS_COST_PER_SECOND = 0.004; // $0.004 per second

export function estimateAudioCost(
  text: string,
  costPerSecond: number = ELEVEN_LABS_COST_PER_SECOND,
): number {
  const estimatedDuration = estimateAudioDuration(text);

  const cost = estimatedDuration * costPerSecond;
  return parseFloat(cost.toFixed(3));
}

export function estimateAudioDuration(text: string, wpm: number = 160): number {
  if (!text) return 0;

  // Split text into lines to check for the current script format
  const lines = text.split("\n");
  const dialogueLines = lines.filter(
    (line) =>
      line.trim().toLowerCase().startsWith("narrator:") ||
      line.trim().toLowerCase().startsWith("voiceover:"),
  );

  // If we found specific dialogue lines, only use those for estimation
  // Otherwise, fallback to the entire text (for simple scripts)
  let processedText = text;
  if (dialogueLines.length > 0) {
    processedText = dialogueLines
      .map((line) => line.replace(/^(narrator|voiceover):\s*/i, ""))
      .join(" ");
  }

  // Count words by splitting the text using a regex that matches words
  const words = processedText.match(/\b\w+\b/g) || [];
  const numWords = words.length;

  if (numWords <= 1) {
    return numWords;
  }

  // Calculate duration in seconds
  const duration = (numWords / wpm) * 60;
  const result = parseFloat(duration.toFixed(2));
  return result > 1 ? result : 1;
}
