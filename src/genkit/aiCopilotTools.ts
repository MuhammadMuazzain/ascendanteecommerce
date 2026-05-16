import type { Asset } from "@/lib/database/types";
import type { R2StorageService } from "@/lib/r2-storage";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { StockVideoService } from "@/lib/pexels";
import { generateId } from "@/utils/id";

export type AiCopilotToolContext = {
  send: (data: object) => void;
  baseUrl: string;
  currentVideo: Asset | undefined;
  getLocalCurrentClips: () => any[];
  setLocalCurrentClips: (clips: any[]) => void;
  workflowTags: Set<string>;
  r2: R2StorageService;
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AiCopilotToolContext,
): Promise<unknown> {
  switch (name) {
    case "process_video_workflow":
      return executeProcessVideoWorkflow(args as any, ctx);
    case "create_clips":
      return executeCreateClips(args as { clips: any[] }, ctx);
    case "reframe_video":
      return executeReframeVideo(args as any, ctx);
    case "generate_captions":
      return executeGenerateCaptions(args as { urls?: string[] }, ctx);
    case "generate_sound_effects":
      return executeGenerateSoundEffects(args as any, ctx);
    case "add_b_roll":
      return executeAddBRoll(args as any, ctx);
    default:
      throw new Error("Unknown tool: " + name);
  }
}

async function executeProcessVideoWorkflow(
  args: any,
  ctx: AiCopilotToolContext,
): Promise<{ clips: any[] }> {
  const {
    clips = [],
    apply_reframe = false,
    apply_captions = false,
    apply_sound_effects = false,
    apply_b_roll = false,
    sfx_prompts = [],
    b_roll_prompts = [],
  } = args;

  if (!ctx.currentVideo) throw new Error("Cannot process workflow without a video");

  let currentClips = [...ctx.getLocalCurrentClips()];
  const hasNewClips = Array.isArray(clips) && clips.length > 0;
  const isRedundantClipping =
    hasNewClips &&
    currentClips.length > 0 &&
    clips.length === currentClips.length &&
    clips.every((c: any, i: number) => {
      const existing = currentClips[i];
      const clipStart = c.start_time || c.start;
      const clipEnd = c.end_time || c.end;
      return clipStart === existing.trimStartTime && clipEnd === existing.trimEndTime;
    });
  const shouldTrim = hasNewClips && !isRedundantClipping;

  const workflow: any[] = [
    ...(shouldTrim ? [{ id: "trim", label: "Trimming segments", status: "in_progress" }] : []),
    ...(apply_reframe ? [{ id: "reframe", label: "Reframing to 9:16", status: "pending" }] : []),
    ...(apply_captions
      ? [{ id: "captions", label: "Generating captions", status: "pending" }]
      : []),
    ...(apply_sound_effects
      ? [{ id: "sfx", label: "Adding sound effects", status: "pending" }]
      : []),
    ...(apply_b_roll ? [{ id: "b-roll", label: "Adding b-rolls", status: "pending" }] : []),
  ];
  const shouldShowWorkflow = workflow.length >= 2;
  const updateWorkflow = (id: string, status: string) => {
    const task = workflow.find((t: any) => t.id === id);
    if (task) task.status = status;
    if (shouldShowWorkflow) ctx.send({ workflow });
  };

  if (shouldShowWorkflow) {
    ctx.send({
      status:
        "Starting workflow for " +
        (shouldTrim ? clips.length + " clip(s)" : "current content") +
        "...",
      tool: "process_video_workflow",
      workflow,
    });
  } else {
    ctx.send({
      status: (workflow[0]?.label || "Processing") + "...",
      tool: "process_video_workflow",
    });
  }

  if (shouldTrim) {
    const trimResponse = await fetch(ctx.baseUrl + "/api/trim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: ctx.currentVideo.public_url,
        segments: clips.map((s: any, i: number) => ({
          trimStartTime: s.start_time || s.trim_start_time || s.start || "0:00",
          trimEndTime: s.end_time || s.trim_end_time || s.end || "full",
          description: s.description,
          hookScore: s.hook_score,
          retentionScore: s.retention_score,
          title: s.title,
          preset: s.preset,
          id: "trimmed-" + i,
        })),
      }),
    });
    const trimResult = await trimResponse.json();
    currentClips = trimResult.trimmed.map((c: any) => ({
      ...c,
      action: "Short",
    }));
    ctx.workflowTags.add("Trimming");
    ctx.send({ clips: currentClips, status: null });
    updateWorkflow("trim", "done");
  }

  if (apply_reframe) {
    updateWorkflow("reframe", "in_progress");
    ctx.send({ reframing_urls: currentClips.map((c: any) => c.url) });
    const reframePromises = currentClips.map(async (clip: any) => {
      try {
        const response = await fetch("https://auto-reframe-api-eekuywuwcq-uc.a.run.app/reframe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: clip.url, aspect_ratio: "9:16" }),
        });
        const data = await response.json();
        const { status: _s, ...reframeData } = data;
        return {
          ...clip,
          ...reframeData,
          original_url: clip.url,
          action: "Reframe",
        };
      } catch (e) {
        console.error("Reframe error:", e);
        return clip;
      }
    });
    currentClips = await Promise.all(reframePromises);
    ctx.send({ reframed_clips: currentClips });
    updateWorkflow("reframe", "done");
    ctx.workflowTags.add("Reframing");
  }

  if (apply_captions) {
    updateWorkflow("captions", "in_progress");
    ctx.send({ status: "Step 3/4: Generating captions..." });
    ctx.send({
      clips: currentClips.map((c: any) => ({
        ...c,
        isTranscribing: true,
        status: "transcribing",
      })),
    });
    const transcribePromises = currentClips.map(async (clip: any) => {
      try {
        const response = await fetch(ctx.baseUrl + "/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: clip.url, uploadToR2: true }),
        });
        const data = await response.json();
        return {
          ...clip,
          speechToText: data,
          isTranscribing: false,
          action: "Captions",
        };
      } catch (e) {
        console.error("Transcribe error:", e);
        return { ...clip, isTranscribing: false };
      }
    });
    currentClips = await Promise.all(transcribePromises);
    ctx.send({ clips: currentClips });
    updateWorkflow("captions", "done");
    ctx.workflowTags.add("Captions");
  }

  if (apply_sound_effects) {
    updateWorkflow("sfx", "in_progress");
    ctx.send({
      status: "Step 4/4: Adding " + sfx_prompts.length + " sound effect(s)...",
    });
    ctx.send({
      clips: currentClips.map((c: any) => ({
        ...c,
        status: "generating_sounds",
      })),
    });
    const sfxByClip: Record<number, any[]> = {};
    sfx_prompts.forEach((p: any) => {
      if (!sfxByClip[p.clip_index]) sfxByClip[p.clip_index] = [];
      sfxByClip[p.clip_index].push(p);
    });
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
    const sfxPromises = currentClips.map(async (clip: any, index: number) => {
      const prompts = sfxByClip[index] || [];
      if (prompts.length === 0) return clip;
      try {
        const soundEffects = await Promise.all(
          prompts.map(async (prompt: any) => {
            try {
              const audioStream = await elevenlabs.textToSoundEffects.convert({
                text: prompt.text,
              });
              const chunks: any[] = [];
              for await (const chunk of audioStream as unknown as AsyncIterable<Uint8Array>)
                chunks.push(chunk);
              const buffer = Buffer.concat(chunks);
              const r2Url = await ctx.r2.uploadData(
                "sfx-" + generateId() + ".mp3",
                buffer,
                "audio/mpeg",
              );
              return { time: prompt.time, url: r2Url };
            } catch (e) {
              console.error("SFX generation error:", e);
              return null;
            }
          }),
        );
        return {
          ...clip,
          soundEffects: [...(clip.soundEffects || []), ...soundEffects.filter(Boolean)],
          action: "SFX added",
        };
      } catch (e) {
        console.error("Clip SFX error:", e);
        return clip;
      }
    });
    currentClips = await Promise.all(sfxPromises);
    ctx.send({ clips: currentClips });
    updateWorkflow("sfx", "done");
    ctx.workflowTags.add("Sound Effects");
  }

  if (apply_b_roll) {
    updateWorkflow("b-roll", "in_progress");
    ctx.send({
      status: "Step 5/5: Adding " + (b_roll_prompts?.length || "automated") + " b-roll(s)...",
    });
    ctx.send({
      clips: currentClips.map((c: any) => ({ ...c, status: "editing" })),
    });
    const bRollPromises = currentClips.map(async (clip: any, index: number) => {
      const prompts = (b_roll_prompts || []).filter((p: any) => p.clip_index === index);
      const keyword = clip.description || "cinematic landscape";
      if (prompts.length === 0 && !b_roll_prompts?.length) {
        const media = await StockVideoService.getBestMediaUrl(keyword, "video");
        if (media) {
          return {
            ...clip,
            bRolls: [
              ...(clip.bRolls || []),
              {
                time: 2,
                url: media.url,
                duration: media.duration * 1000,
                type: media.type,
              },
            ],
            action: "B-Roll added",
          };
        }
        return clip;
      }
      const bRolls = await Promise.all(
        prompts.map(async (p: any) => {
          const media = await StockVideoService.getBestMediaUrl(p.keyword, p.type);
          return media
            ? {
                time: p.time,
                url: media.url,
                duration: media.duration * 1000,
                type: media.type,
              }
            : null;
        }),
      );
      return {
        ...clip,
        bRolls: [...(clip.bRolls || []), ...bRolls.filter(Boolean)],
        action: "B-Roll added",
      };
    });
    currentClips = await Promise.all(bRollPromises);
    ctx.send({ clips: currentClips });
    updateWorkflow("b-roll", "done");
    ctx.workflowTags.add("B-Rolls");
  }

  ctx.send({
    clips: currentClips.map((c: any) => ({
      ...c,
      status: "ready",
      isReframing: false,
      isTranscribing: false,
    })),
    status: null,
    workflow: workflow.map((t: any) => ({ ...t, status: "done" })),
  });
  ctx.setLocalCurrentClips(currentClips);
  return { clips: currentClips };
}

async function executeCreateClips(
  args: { clips: any[] },
  ctx: AiCopilotToolContext,
): Promise<{ clips: any[] }> {
  const { clips } = args;
  ctx.send({
    workflow: [{ id: "trimming", label: "Trimming segments", status: "in_progress" }],
    segments: clips,
  });
  if (!ctx.currentVideo) throw new Error("Cannot create clips without a video");
  const trimResponse = await fetch(ctx.baseUrl + "/api/trim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: ctx.currentVideo.public_url,
      segments: clips.map((s: any, i: number) => ({
        trimStartTime: s.start_time || s.trim_start_time || s.start || "0:00",
        trimEndTime: s.end_time || s.trim_end_time || s.end || "full",
        description: s.description,
        hookScore: s.hook_score,
        retentionScore: s.retention_score,
        title: s.title,
        id: i,
      })),
    }),
  });
  const trimResult = await trimResponse.json();
  const trimmedWithAction = trimResult.trimmed.map((c: any) => ({
    ...c,
    action: "Short",
  }));
  ctx.workflowTags.add("Trimming");
  ctx.setLocalCurrentClips(trimmedWithAction);
  ctx.send({
    clips: trimmedWithAction,
    status: null,
    workflow: [{ id: "trimming", label: "Trimming segments", status: "done" }],
  });
  return { clips: trimmedWithAction };
}

async function executeReframeVideo(
  args: any,
  ctx: AiCopilotToolContext,
): Promise<{ reframed: any[] }> {
  let { urls = [], aspect_ratio = "9:16" } = args;
  const currentClips = ctx.getLocalCurrentClips();
  if (currentClips?.length > 0) urls = currentClips.map((c: any) => c.url);
  ctx.send({
    workflow: [
      {
        id: "reframing",
        label: "Reframing to " + aspect_ratio,
        status: "in_progress",
      },
    ],
    reframing_urls: urls,
  });
  const reframePromises = urls.map(async (url: string) => {
    try {
      const response = await fetch("https://auto-reframe-api-eekuywuwcq-uc.a.run.app/reframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, aspect_ratio }),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Failed to reframe");
      const data = await response.json();
      const { status: _s, ...reframeData } = data;
      return { ...reframeData, original_url: url };
    } catch (error) {
      console.error("Error reframing:", error);
      return { url, original_url: url, error: String(error) };
    }
  });
  const reframeResults = await Promise.all(reframePromises);
  const reframedWithAction = reframeResults.map((r: any) => {
    const original = (ctx.getLocalCurrentClips() || []).find((c: any) => c.url === r.original_url);
    return {
      ...r,
      id: original?.id,
      description: original?.description,
      trim_start_time: original?.trim_start_time,
      trim_end_time: original?.trim_end_time,
      action: "Reframe",
    };
  });
  ctx.workflowTags.add("Reframing");
  ctx.setLocalCurrentClips(reframedWithAction);
  ctx.send({
    reframed_clips: reframedWithAction,
    status: null,
    workflow: [
      {
        id: "reframing",
        label: "Reframing to " + aspect_ratio,
        status: "done",
      },
    ],
  });
  return { reframed: reframedWithAction };
}

async function executeGenerateCaptions(
  args: { urls?: string[] },
  ctx: AiCopilotToolContext,
): Promise<{ transcribed: any[] }> {
  let { urls = [] } = args;
  const currentClips = ctx.getLocalCurrentClips();
  if (currentClips?.length > 0) urls = currentClips.map((c: any) => c.url);
  const transcribeTasks =
    currentClips?.length > 0
      ? currentClips.map((c: any) => ({ ...c, isTranscribing: true }))
      : urls.map((url: string, i: number) => ({
          id: "transcribe-" + i,
          url,
          isTranscribing: true,
          description: "Generating captions...",
        }));
  ctx.send({
    workflow: [{ id: "captions", label: "Generating captions", status: "in_progress" }],
    clips: transcribeTasks,
  });
  const transcribePromises = urls.map(async (url: string) => {
    try {
      const response = await fetch(ctx.baseUrl + "/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, uploadToR2: true }),
      });
      if (!response.ok) throw new Error("Failed to transcribe");
      return { url: await response.json(), original_url: url };
    } catch (error) {
      return { error: String(error), original_url: url };
    }
  });
  const results = await Promise.all(transcribePromises);
  const finalClips = results.map((result: any, i: number) => {
    const original = (currentClips || []).find((c: any) => c.url === result.original_url);
    return {
      ...original,
      id: original?.id || "transcribe-" + i,
      url: result.original_url,
      speechToText: result.url,
      isTranscribing: false,
      description: original?.description || "Transcribed video",
      action: "Transcribe",
    };
  });
  ctx.workflowTags.add("Captions");
  ctx.setLocalCurrentClips(finalClips);
  ctx.send({
    clips: finalClips,
    status: null,
    workflow: [{ id: "captions", label: "Generating captions", status: "done" }],
  });
  return { transcribed: finalClips };
}

async function executeGenerateSoundEffects(
  args: any,
  ctx: AiCopilotToolContext,
): Promise<{ clips: any[] }> {
  const { clips: soundEffectClips } = args;
  const currentClips = ctx.getLocalCurrentClips();
  ctx.send({
    workflow: [{ id: "sfx", label: "Generating sound effects", status: "in_progress" }],
    clips: (currentClips || []).map((c: any) => ({
      ...c,
      status: "generating_sounds",
      action: "Sounds",
    })),
  });
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });
  const soundEffectResults = await Promise.all(
    soundEffectClips.map(async (clipData: any) => {
      const soundEffects = await Promise.all(
        clipData.prompts.map(async (prompt: any) => {
          try {
            const audioStream = await elevenlabs.textToSoundEffects.convert({
              text: prompt.text,
            });
            const chunks: any[] = [];
            for await (const chunk of audioStream as unknown as AsyncIterable<Uint8Array>)
              chunks.push(chunk);
            const r2Url = await ctx.r2.uploadData(
              "sfx-" + generateId() + ".mp3",
              Buffer.concat(chunks),
              "audio/mpeg",
            );
            return { time: prompt.time, url: r2Url };
          } catch (error) {
            console.error("SFX error:", error);
            return null;
          }
        }),
      );
      return {
        url: clipData.url,
        soundEffects: soundEffects.filter((s): s is { time: number; url: string } => !!s),
      };
    }),
  );
  const getBasename = (url: string) => url.split("/").pop()?.split("?")[0];
  const finalClips = (currentClips || []).map((c: any) => {
    let result = soundEffectResults.find((r: any) => r.url === c.url);
    if (!result && currentClips?.length === 1 && soundEffectResults.length === 1)
      result = soundEffectResults[0];
    if (!result)
      result = soundEffectResults.find((r: any) => getBasename(r.url) === getBasename(c.url));
    if (result) {
      let trim_end_time = c.trim_end_time;
      if (trim_end_time === "full" && ctx.currentVideo?.duration) {
        const sec = ctx.currentVideo.duration || 0;
        if (!Number.isNaN(sec))
          trim_end_time = Math.floor(sec / 60) + ":" + (sec % 60).toString().padStart(2, "0");
      }
      return {
        ...c,
        soundEffects: [...(c.soundEffects || []), ...result.soundEffects],
        trim_end_time,
        status: "ready",
        action: "Sounds",
      };
    }
    return c;
  });
  ctx.workflowTags.add("Sound Effects");
  ctx.setLocalCurrentClips(finalClips);
  ctx.send({
    clips: finalClips,
    status: null,
    workflow: [{ id: "sfx", label: "Generating sound effects", status: "done" }],
  });
  return { clips: finalClips };
}

async function executeAddBRoll(args: any, ctx: AiCopilotToolContext): Promise<{ clips: any[] }> {
  const { clips: bRollClips } = args;
  const currentClips = ctx.getLocalCurrentClips();
  ctx.send({
    workflow: [{ id: "b-roll", label: "Adding b-rolls", status: "in_progress" }],
    clips: (currentClips || []).map((c: any) => ({
      ...c,
      status: "editing",
      action: "B-Roll",
    })),
  });
  const bRollResults = await Promise.all(
    bRollClips.map(async (clipData: any) => {
      const bRolls = await Promise.all(
        clipData.prompts.map(async (prompt: any) => {
          try {
            const media = await StockVideoService.getBestMediaUrl(prompt.keyword, prompt.type);
            return media
              ? {
                  time: prompt.time,
                  url: media.url,
                  duration: media.duration * 1000,
                  type: media.type,
                }
              : null;
          } catch (error) {
            console.error("B-roll error:", error);
            return null;
          }
        }),
      );
      return {
        url: clipData.url,
        bRolls: bRolls.filter(
          (
            b,
          ): b is {
            time: number;
            url: string;
            duration: number;
            type: "video" | "image";
          } => !!b,
        ),
      };
    }),
  );
  const getBasename = (url: string) => url.split("/").pop()?.split("?")[0];
  const finalClips = (currentClips || []).map((c: any) => {
    let result = bRollResults.find((r: any) => r.url === c.url);
    if (!result && currentClips?.length === 1 && bRollResults.length === 1)
      result = bRollResults[0];
    if (!result) result = bRollResults.find((r: any) => getBasename(r.url) === getBasename(c.url));
    if (result)
      return {
        ...c,
        bRolls: [...(c.bRolls || []), ...result.bRolls],
        status: "ready",
        action: "B-Rolls Added",
      };
    return c;
  });
  ctx.workflowTags.add("B-Rolls");
  ctx.setLocalCurrentClips(finalClips);
  ctx.send({
    clips: finalClips,
    status: null,
    workflow: [{ id: "b-roll", label: "Adding b-rolls", status: "done" }],
  });
  return { clips: finalClips };
}
