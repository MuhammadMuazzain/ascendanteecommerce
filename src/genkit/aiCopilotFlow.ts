import { z } from "genkit";
import { ai } from "@/genkit/chatFlow";
import { db } from "@/lib/database";
import type { Asset } from "@/lib/database/types";
import { GeminiService, TOOL_DEFINITIONS } from "@/lib/gemini/copilot";
import { R2StorageService } from "@/lib/r2-storage";
import { config } from "@/inngest/config";
import { chatQueries } from "@/lib/database/chat-queries";
import { SocialVideoService } from "@/lib/social-video-service";
import { generateId } from "@/utils/id";
import { executeTool } from "@/genkit/aiCopilotTools";
import type { AiCopilotToolContext } from "@/genkit/aiCopilotTools";

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

export const aiCopilotFlow = ai.defineFlow(
  {
    name: "aiCopilotFlow",
    inputSchema: z.object({
      messages: z.array(z.any()),
      projectId: z.string(),
      videoId: z.string().optional().nullable(),
      currentClips: z.array(z.any()).optional(),
      userId: z.string(),
      baseUrl: z.string(),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
    streamSchema: z.string(),
  },
  async ({ messages, projectId, videoId, currentClips, userId, baseUrl }, { sendChunk }) => {
    const send = (data: object) => sendChunk(JSON.stringify(data) + "\n");

    let effectiveVideoId = videoId ?? undefined;
    let video: Asset | undefined = undefined;
    let currentCacheKey: string | undefined = undefined;

    if (
      !effectiveVideoId &&
      currentClips &&
      Array.isArray(currentClips) &&
      currentClips.length > 0
    ) {
      const firstClipUrl = currentClips[0].url;
      if (firstClipUrl) {
        const assetByUrl = await db
          .selectFrom("assets")
          .select("id")
          .where("public_url", "=", firstClipUrl)
          .executeTakeFirst();
        if (assetByUrl) effectiveVideoId = assetByUrl.id;
      }
    }

    if (!effectiveVideoId && projectId && userId) {
      const existingSession = await db
        .selectFrom("chat_sessions")
        .select("video_id")
        .where("user_id", "=", userId)
        .where("project_id", "=", projectId)
        .where("video_id", "is not", null)
        .orderBy("created_at", "desc")
        .executeTakeFirst();
      if (existingSession?.video_id) effectiveVideoId = existingSession.video_id;
    }

    if (effectiveVideoId) {
      video = await db
        .selectFrom("assets")
        .selectAll()
        .where("id", "=", effectiveVideoId)
        .executeTakeFirst();

      if (video && !video.duration && video.gemini_file_uri) {
        try {
          const file = await GeminiService.client.files.get({
            name: video.gemini_file_uri.split("/").pop()!,
          });
          const duration = file.videoMetadata?.videoDuration as string | undefined;
          if (duration) {
            await db
              .updateTable("assets")
              .set({ duration: parseFloat(duration) })
              .where("id", "=", video.id)
              .execute();
            video.duration = parseFloat(duration);
          }
        } catch (e) {
          console.error("Failed to fetch/update video duration:", e);
        }
      }

      if (video) {
        if (!video.gemini_file_uri) {
          send({ status: "Indexing video with AI..." });
          video = await GeminiService.indexAsset(video);
        }
        currentCacheKey = await GeminiService.ensureCache(video, TOOL_DEFINITIONS);
      }
    }

    let processedVideoId = effectiveVideoId;
    let currentVideo = video;

    const chatSession = await chatQueries.getOrCreateSession(
      userId,
      projectId,
      processedVideoId || null,
    );

    const latestUserMsg = messages[messages.length - 1];
    if (
      latestUserMsg &&
      latestUserMsg.role === "user" &&
      typeof latestUserMsg.content === "string"
    ) {
      const socialUrls = SocialVideoService.extractUrls(latestUserMsg.content);
      if (socialUrls.length > 0) {
        const socialUrl = socialUrls[0];
        try {
          const socialAsset = await SocialVideoService.processUrl(
            socialUrl,
            userId,
            projectId,
            (msg) => send({ status: msg }),
          );
          processedVideoId = socialAsset.id;
          currentVideo = socialAsset;
          await db
            .updateTable("chat_sessions")
            .set({ video_id: processedVideoId })
            .where("id", "=", chatSession.id)
            .execute();
          if (!currentVideo.gemini_file_uri) {
            send({ status: "Indexing video with AI..." });
            currentVideo = await GeminiService.indexAsset(currentVideo);
          }
          currentCacheKey = await GeminiService.ensureCache(currentVideo, TOOL_DEFINITIONS);
          send({ videoId: processedVideoId });
        } catch (e: unknown) {
          console.error("Failed to process social URL:", e);
          send({
            text: "Error processing video: " + (e instanceof Error ? e.message : String(e)),
          });
        }
      }
    }

    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage && latestUserMessage.role === "user") {
      await chatQueries.addMessage({
        id: generateId(),
        session_id: chatSession.id,
        role: "user",
        content: latestUserMessage.content,
        metadata: {},
      });
    }

    let currentMessages = [...messages];
    let localCurrentClips = currentClips ?? [];
    let accumulatedAssistantText = "";
    const workflowTags = new Set<string>();
    let isDone = false;

    const ctx: AiCopilotToolContext = {
      send,
      baseUrl,
      currentVideo,
      getLocalCurrentClips: () => localCurrentClips,
      setLocalCurrentClips: (clips) => {
        localCurrentClips = clips;
      },
      workflowTags,
      r2,
    };

    outer: while (!isDone) {
      ctx.currentVideo = currentVideo;
      let stream: AsyncIterable<any>;
      try {
        stream = await GeminiService.streamContent(currentMessages, currentCacheKey);
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("CachedContent not found") && currentVideo) {
          send({ status: "Refreshing AI context..." });
          currentCacheKey = await GeminiService.ensureCache(currentVideo, TOOL_DEFINITIONS, true);
          stream = await GeminiService.streamContent(currentMessages, currentCacheKey);
        } else {
          throw error;
        }
      }

      let assistantParts: any[] = [];
      let hasFunctionCall = false;

      for await (const chunk of stream) {
        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        assistantParts.push(...parts);

        for (const part of parts) {
          if (part.text) {
            accumulatedAssistantText += part.text;
            send({ text: part.text });
          }

          if (part.functionCall) {
            hasFunctionCall = true;
            const call = part.functionCall;
            let toolResult: unknown;
            try {
              toolResult = await executeTool(call.name, call.args || {}, ctx);
            } catch (toolError: unknown) {
              send({
                text: (toolError instanceof Error ? toolError.message : String(toolError)) + "\n",
              });
              toolResult = {};
            }

            currentMessages.push({
              role: "model",
              parts: assistantParts,
            });
            currentMessages.push({
              role: "function",
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: toolResult,
                  },
                },
              ],
            });

            continue outer;
          }
        }
      }

      if (!hasFunctionCall) {
        isDone = true;
      }
    }

    await chatQueries.addMessage({
      id: generateId(),
      session_id: chatSession.id,
      role: "assistant",
      content: accumulatedAssistantText,
      metadata: { clips: localCurrentClips },
    });

    if (localCurrentClips && localCurrentClips.length > 0) {
      await chatQueries.deleteSegments(projectId);
      const project = await db
        .selectFrom("projects")
        .selectAll()
        .where("id", "=", projectId)
        .executeTakeFirst();

      if (project) {
        let userPrompt = "";
        if (messages && Array.isArray(messages)) {
          const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
          if (lastUserMsg) userPrompt = lastUserMsg.content;
        }

        if (workflowTags.has("Trimming")) {
          for (let i = 0; i < localCurrentClips.length; i++) {
            const clip = localCurrentClips[i];
            const newSchemaId = generateId();
            await db
              .insertInto("schemas")
              .values({
                id: newSchemaId,
                project_id: projectId,
                title: project.name + " - Segment " + (i + 1),
                description: project.description,
                prompt_preview: project.thumbnail || "",
                tags: Array.from(workflowTags),
                music: null,
                voice: null,
                visuals: { type: "STOCK_VIDEOS", style: "Cinematic" },
                caption: workflowTags.has("Captions")
                  ? {
                      id: "caption-7",
                      name: "Modern",
                      size: "medium",
                      position: "bottom",
                    }
                  : null,
                resolution: "1080p",
                aspect_ratio: "9:16",
                type: workflowTags.has("Captions") ? "captions-video" : "trimmed-video",
                execution_mode: "render",
                metadata: {},
              })
              .execute();
            await chatQueries.saveSegment({
              id: generateId(),
              project_id: projectId,
              schema_id: newSchemaId,
              session_id: chatSession.id,
              asset_id: processedVideoId || null,
              order: i,
              segment_data: clip,
            });
          }
        } else {
          let schemaId: string | null = null;
          const existingSchema = await db
            .selectFrom("schemas")
            .select("id")
            .where("project_id", "=", projectId)
            .executeTakeFirst();
          if (existingSchema) {
            schemaId = existingSchema.id;
          } else {
            schemaId = generateId();
            await db
              .insertInto("schemas")
              .values({
                id: schemaId,
                project_id: projectId,
                title: project.name,
                description: project.description,
                prompt_preview: project.thumbnail || "",
                tags: Array.from(workflowTags),
                music: null,
                voice: null,
                visuals: { type: "STOCK_VIDEOS", style: "Cinematic" },
                caption: workflowTags.has("Captions")
                  ? {
                      id: "caption-7",
                      name: "Modern",
                      size: "medium",
                      position: "bottom",
                    }
                  : null,
                resolution: "1080p",
                aspect_ratio: "9:16",
                type: workflowTags.has("Captions") ? "captions-video" : "project-video",
                execution_mode: "render",
                metadata: {},
              })
              .execute();
          }
          for (let i = 0; i < localCurrentClips.length; i++) {
            const clip = localCurrentClips[i];
            await chatQueries.saveSegment({
              id: generateId(),
              project_id: projectId,
              schema_id: schemaId!,
              session_id: chatSession.id,
              asset_id: processedVideoId || null,
              order: i,
              segment_data: clip,
            });
          }
        }
      }
    }

    return { ok: true };
  },
);
