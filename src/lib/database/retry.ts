/**
 * Retries a database operation with exponential backoff.
 * Useful for handling transient connection timeouts in serverless environments.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isTimeout =
        err.message?.toLowerCase().includes("timeout") ||
        err.message?.toLowerCase().includes("connection terminated") ||
        err.message?.toLowerCase().includes("unexpectedly");

      if (!isTimeout || attempt === maxRetries - 1) {
        throw err;
      }

      console.warn(
        `[DB_RETRY] Attempt ${attempt + 1} failed. Retrying in ${delay * Math.pow(2, attempt)}ms...`,
        err.message,
      );
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}
