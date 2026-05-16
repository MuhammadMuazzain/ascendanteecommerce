import { db } from "@/lib/database";
import { GeminiService } from "@/lib/gemini/generator";
import { ResolverStatus } from "@/utils/enum";
import { getInngestApp } from "../../index";
import { workflowChannel } from "../../utils/common";
import { ToastType } from "../../utils/types";

const inngest = getInngestApp();

/**
 * UGC Ad Script Generator
 *
 * Specialized function for writing authentic UGC scripts.
 */
export const generateUGCScript = inngest.createFunction(
  { id: "ugc-ad-script-generator", triggers: { event: "ugc/script.request" } },
  async ({ event, step }) => {
    const { message, imageUrls, schemaId, previousSchema, productName, productDescription } =
      event.data;
    const channel = workflowChannel(schemaId);

    // 1. Initial Status Update
    await step.run("mark-scripting-start", async () => {
      await db
        .updateTable("generations")
        .set({
          status: ResolverStatus.PROGRESS,
          metadata: { message: "AI is writing your UGC ad script..." },
        })
        .where("id", "=", schemaId)
        .execute();
    });

    // 2. Gemini Generation
    const result = await step.run("generate-script-content", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

      const gemini = new GeminiService(apiKey, "gemini-2.5-flash-lite");
      return await gemini.generateScriptAssistant({
        message,
        imageUrls,
        schema: previousSchema,
        productName,
        productDescription,
      });
    });

    // 3. Persist result
    await step.run("save-script-result", async () => {
      await db
        .updateTable("generations")
        .set({
          input: result,
          status: ResolverStatus.COMPLETED,
          metadata: { message: "UGC ad scripting complete." },
        })
        .where("id", "=", schemaId)
        .execute();
    });

    // 4. Notify Frontend
    await step.run("notify-success", async () => {});

    return result;
  },
);
