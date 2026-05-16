import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";

export type TaskStatus = "pending" | "active" | "completed";

export interface GenerationTask {
  key: string;
  label: string;
  status: TaskStatus;
}

/**
 * Ensures the value is round-tripped through JSON to produce a clean,
 * serializable plain object before it is stored in the DB JSONB column.
 */
const serialize = (val: unknown) => JSON.parse(JSON.stringify(val));

/**
 * Marks a specific task as active and all previous ones as completed.
 * Accepts the full task definition list so each call is self-sufficient —
 * no dependency on a previous `initializeGenerationTasks` step.
 *
 * @param generationId  - The generation row ID
 * @param currentKey    - Key of the task that is now active
 * @param allTaskDefs   - The full ordered task list (keys + labels)
 * @param labelOverride - Optional dynamic label (e.g. "Rendering scenes (Wave 2 of 4)...")
 */
export async function advanceGenerationTask(
  generationId: string,
  currentKey: string,
  allTaskDefs: { key: string; label: string }[],
  labelOverride?: string,
): Promise<void> {
  const activeIdx = allTaskDefs.findIndex((t) => t.key === currentKey);

  const tasks: GenerationTask[] = allTaskDefs.map((t, idx) => ({
    key: t.key,
    label: idx === activeIdx && labelOverride ? labelOverride : t.label,
    status: idx < activeIdx ? "completed" : idx === activeIdx ? "active" : "pending",
  }));

  const message = labelOverride ?? allTaskDefs[activeIdx]?.label ?? currentKey;

  await withDbRetry(() =>
    db
      .updateTable("generations")
      .set({ metadata: serialize({ tasks, message }) })
      .where("id", "=", generationId)
      .execute(),
  );
}
