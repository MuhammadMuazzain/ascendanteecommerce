import { getInngestApp } from "../../index";
import { getViralVideos } from "./utils/kalodata-agent";
import { db } from "@/lib/database";
import { NonRetriableError } from "inngest";
import { ResolverStatus } from "@/utils/enum";

const inngest = getInngestApp();

export const kalodataVideosOrchestrator = inngest.createFunction(
  {
    id: "kalodata-videos-orchestrator",
    triggers: { event: "kalodata-videos/analyze" },
  },
  async ({ event, step }) => {
    const { generationId, productUrl } = event.data;

    try {
      // 1. Mark as Progress
      await step.run("mark-progress", async () => {
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS, progress: 10 })
          .where("id", "=", generationId)
          .execute();
      });

      // 2. Run Kalodata Agent
      const results = await step.run("run-kalodata-agent", async () => {
        return await getViralVideos(productUrl);
      });

      console.log("Results:", results);

      // 3. Mark as Completed and Save Results
      await step.run("mark-completed", async () => {
        await db
          .updateTable("generations")
          .set({
            status: ResolverStatus.COMPLETED,
            progress: 100,
            output: JSON.stringify(results),
          })
          .where("id", "=", generationId)
          .execute();
      });

      return { success: true, count: results.length };
    } catch (error: any) {
      console.error("Kalodata Videos Orchestrator Error:", error);

      await step.run("mark-failed", async () => {
        await db
          .updateTable("generations")
          .set({
            status: ResolverStatus.FAILED,
            metadata: JSON.stringify({ error: error.message }),
          })
          .where("id", "=", generationId)
          .execute();
      });

      throw new NonRetriableError(`Kalodata Videos Analysis failed: ${error.message}`);
    }
  },
);
