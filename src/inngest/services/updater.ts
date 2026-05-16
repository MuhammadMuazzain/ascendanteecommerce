import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";
import { VideoSegment } from "../utils/types";
import { calcProgress } from "../functions/common/utils/common";

/**
 * Handles sequential updates of scheme segments.
 * Ensures updates run in order using a promise queue.
 */
export class SegmentUpdater {
  private queue: Promise<void> = Promise.resolve();
  private isFinalized = false;
  private completedSegments = 0;
  private totalSegments: number;

  constructor(
    private schemeId: string,
    totalSegments: number,
  ) {
    this.totalSegments = totalSegments;
  }

  /**
   * Public method called to update a single segment.
   * Each call is queued to maintain execution order.
   */
  async updateSegment(partialData: VideoSegment) {
    if (this.isFinalized) return;

    this.queue = this.queue
      .then(() => this._updateSegment(partialData))
      .catch((err) => console.error(`[QUEUE_UPDATE_ERROR] Segment ${partialData.id}`, err));

    return this.queue;
  }

  /**
   * Internal method that performs the actual database update.
   * Calculates progress incrementally and prevents regressions.
   */
  private async _updateSegment(result: VideoSegment) {
    // Fetch the current generation from the database
    const scheme = await withDbRetry(() =>
      db.selectFrom("generations").selectAll().where("id", "=", this.schemeId).executeTakeFirst(),
    );

    if (!scheme) throw new Error(`Scheme not found: ${this.schemeId}`);

    // Increase local counter only when this update is confirmed
    this.completedSegments++;

    // Define the valid progress range for segment updates
    const minProgress = calcProgress(3 + 1, this.totalSegments);
    const maxProgress = calcProgress(3 + this.totalSegments, this.totalSegments);
    const step =
      this.totalSegments > 1 ? (maxProgress - minProgress) / (this.totalSegments - 1) : 0;

    // Calculate the next progress value safely
    const previousProgress = Number(scheme.progress ?? minProgress);
    const nextProgress =
      this.totalSegments > 1 ? Number((previousProgress + step).toFixed(2)) : maxProgress;
    const progress = Math.min(Math.max(previousProgress, nextProgress), maxProgress);

    // 1. Update the generation (for global progress and legacy support)
    let outputUpdated = false;
    let updatedOutput: any = scheme.output;

    if (Array.isArray(scheme.output)) {
      const output = scheme.output || [];
      updatedOutput = [...output.filter((s: any) => s.id !== result.id), result];
      outputUpdated = true;
    }

    if (outputUpdated) {
      await withDbRetry(() =>
        db
          .updateTable("generations")
          .set({ output: JSON.stringify(updatedOutput), progress })
          .where("id", "=", this.schemeId)
          .execute(),
      );
    } else {
      await withDbRetry(() =>
        db.updateTable("generations").set({ progress }).where("id", "=", this.schemeId).execute(),
      );
    }

    // 2. Update the segments table (for Storyboard UI and new architecture)
    // In standard video generation, the segment table 'id' matches the JSON 'id'
    const existingSegment = await withDbRetry(() =>
      db
        .selectFrom("segments")
        .select("segment_data")
        .where("id", "=", result.id)
        .executeTakeFirst(),
    );

    let segmentData: any = result;
    if (existingSegment && existingSegment.segment_data) {
      const parsedData =
        typeof existingSegment.segment_data === "string"
          ? JSON.parse(existingSegment.segment_data)
          : existingSegment.segment_data;
      segmentData = { ...parsedData, ...result };
    }

    await withDbRetry(() =>
      db
        .updateTable("segments")
        .set({
          segment_data: JSON.stringify(segmentData),
          updated_at: new Date(),
        })
        .where("id", "=", result.id)
        .execute(),
    );

    // 3. Update the schema's updated_at timestamp
    await withDbRetry(() =>
      db
        .updateTable("schemas")
        .set({ updated_at: new Date() })
        .where("id", "=", this.schemeId)
        .execute(),
    );

    // Log progress for debugging or monitoring
    console.log(
      `[PROGRESS] ${this.schemeId} → ${progress.toFixed(2)}% (${this.completedSegments}/${this.totalSegments})`,
    );
  }

  // Waits for all queued updates to finish and prevents new ones.
  async finalize() {
    this.isFinalized = true;
    await this.queue;
  }
}
