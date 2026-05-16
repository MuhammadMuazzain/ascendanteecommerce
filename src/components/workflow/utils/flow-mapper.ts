import { type Node, type Edge, MarkerType } from "@xyflow/react";
import { Schema, Segment, VisualShot } from "@/lib/schema-generator/types";

// ─── Centralized edge style presets ───────────────────────────────────────────
const marker = (color: string) => ({
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color,
});

const primaryEdge = (animated = false): Partial<Edge> => ({
  type: "default",
  animated,
  style: { stroke: "#4f4f7a", strokeWidth: 1.5, opacity: 0.8 },
  markerEnd: marker("#4f4f7a"),
});

const promptEdge = (animated = false): Partial<Edge> => ({
  type: "default",
  animated,
  style: { stroke: "#3b4a6b", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#3b4a6b"),
});

const videoEdge = (animated = false): Partial<Edge> => ({
  type: "default",
  animated,
  style: { stroke: "#5b3f7a", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#5b3f7a"),
});

const voiceEdge = (): Partial<Edge> => ({
  type: "default",
  style: { stroke: "#2d5a42", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#2d5a42"),
});

const collectEdge = (): Partial<Edge> => ({
  type: "default",
  style: { stroke: "#374b6e", strokeWidth: 2, opacity: 0.9 },
  markerEnd: marker("#374b6e"),
});

const productEdge = (): Partial<Edge> => ({
  type: "default",
  style: { stroke: "#6b4f2d", strokeWidth: 1.5, opacity: 0.9 },
  markerEnd: marker("#6b4f2d"),
});

export const mapSchemaToFlow = (
  schema: Schema | null,
  generatingShots: Record<string, string | boolean> = {},
  callbacks?: {
    onUpdate?: (id: string, updates: any) => void;
    onGenerate?: (segmentId: string, shotIndexStr: string, type: "IMAGE" | "VIDEO") => void;
  },
) => {
  const segments = schema?.segments || [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const NODE_WIDTH = 400;

  // 0. Determine if we are in video mode
  const isVideoMode = schema?.type !== "product-image-ad";

  const segmentOutputIds: string[] = [];

  // 1. Global Script Node
  const globalScriptId = "global-script";
  nodes.push({
    id: globalScriptId,
    type: "globalScript",
    data: {
      label: schema?.title,
      text: schema?.script,
      onUpdate: callbacks?.onUpdate,
    },
    style: { width: 400, height: 350 },
    position: { x: 0, y: 0 },
  });

  // 2. Global Product/Assets Node
  const productImages =
    schema?.productImages || (schema?.assets || []).filter((a) => a.type === "image");

  const productNodeId = "global-products";
  if (productImages && productImages.length > 0) {
    nodes.push({
      id: productNodeId,
      type: "product",
      data: {
        products: productImages,
      },
      style: { width: 300, height: 400 },
      position: { x: 0, y: 0 },
    });
  }

  // Shared product assets for injection into product-shot prompts
  const schemaProductAssets = productImages as {
    id: string;
    url: string;
    name: string;
    type: string;
  }[];

  // 2.1 Avatar Node
  const avatarNodeId = "global-avatar";
  if (schema?.avatar?.url) {
    nodes.push({
      id: avatarNodeId,
      type: "avatar",
      data: {
        avatar: schema.avatar,
      },
      style: { width: 300, height: 600 },
      position: { x: 0, y: 0 },
    });
  }

  // 3. Map Segments
  segments.forEach((segment, segmentIndex) => {
    const segmentGroupId = `segment-group-${segment.id}`;
    const contentGroupId = `segment-content-group-${segment.id}`;
    const scriptNodeId = `script-${segment.id}`;
    const voiceNodeId = `voice-${segment.id}`;

    // Segment Group Node (Outer Container)
    nodes.push({
      id: segmentGroupId,
      type: "segmentGroup",
      data: {
        id: segmentGroupId,
        label: segment.title || `Scene ${segmentIndex + 1}`,
        index: segmentIndex,
      },
      style: {}, // Layout will compute size
      position: { x: 0, y: 0 },
    });

    // Segment Content Group (Inner Container)
    nodes.push({
      id: contentGroupId,
      type: "segmentContentGroup",
      parentId: segmentGroupId,
      data: { id: contentGroupId, index: segmentIndex },
      style: {},
      position: { x: 0, y: 0 },
    });

    // Script Node (Child of contentGroup)
    nodes.push({
      id: scriptNodeId,
      type: "script",
      parentId: contentGroupId,
      data: {
        text: segment.text,
        onUpdate: callbacks?.onUpdate,
      },
      style: { width: NODE_WIDTH, height: 350 },
      position: { x: 0, y: 0 },
    });

    // Voice Node (Child of contentGroup)
    nodes.push({
      id: voiceNodeId,
      type: "voice",
      parentId: contentGroupId,
      data: {
        voiceUrl: segment.textToSpeech?.src || segment.audioUrl,
        voiceDuration: segment.textToSpeech?.duration || segment.audioDuration,
      },
      style: { width: 340, height: 420 },
      position: { x: 0, y: 0 },
    });

    // Visuals Group Node (Inner Container - Child of segmentGroup)
    const visualsGroupId = `visuals-group-${segment.id}`;
    const shots = segment.shots || [];

    nodes.push({
      id: visualsGroupId,
      type: "visualsGroup",
      parentId: segmentGroupId,
      data: { label: `Visuals ${segmentIndex + 1}` },
      style: {}, // Layout will compute size
      position: { x: 0, y: 0 },
    });

    // Edge: Global Script -> Script Node
    edges.push({
      id: `e-${globalScriptId}-${scriptNodeId}`,
      source: globalScriptId,
      sourceHandle: "right",
      target: scriptNodeId,
      targetHandle: "input",
      ...primaryEdge(),
    });

    // Edge: Script Node -> Voice Node
    edges.push({
      id: `e-${scriptNodeId}-${voiceNodeId}`,
      source: scriptNodeId,
      sourceHandle: "output",
      target: voiceNodeId,
      targetHandle: "input",
      ...voiceEdge(),
    });

    // UNIFIED CONNECTION: Voice Node -> Visuals Group
    edges.push({
      id: `e-${voiceNodeId}-${visualsGroupId}`,
      source: voiceNodeId,
      sourceHandle: "output",
      target: visualsGroupId,
      ...primaryEdge(),
    });

    // Map Shots directly as children of visualsGroup
    shots.forEach((shot, shotIndex) => {
      const shotBaseId = `shot-${segment.id}-${shotIndex}`;

      const multiShot = shots.length > 1;

      // Prefer shot URLs only when multiple shots per segment — avoids stale segment-level asset bleed-through after single-shot regen.
      const activeImgAsset = segment.assets?.find((a) => a.type === "image" && a.active);
      const activeVidAsset = segment.assets?.find((a) => a.type === "video" && a.active);

      const imgUrl =
        shot.imageUrl || (!multiShot && activeImgAsset?.url ? activeImgAsset.url : undefined);
      const imgShotGroupId = `${shotBaseId}-img-group`;
      nodes.push({
        id: imgShotGroupId,
        type: "shotGroup",
        parentId: visualsGroupId,
        data: { id: imgShotGroupId, type: "IMAGE", index: shotIndex },
        style: {},
        position: { x: 0, y: 0 },
      });

      const isImgGenerating = generatingShots[`${segment.id}-${shotIndex}-img`];
      let imgStatus = "idle";
      if (isImgGenerating || activeImgAsset?.status === "generating") imgStatus = "processing";
      else if (imgUrl) imgStatus = "success";
      else if (shot.status === "failed") imgStatus = "error";

      const isProductShot = (shot as any).type === "product";

      const imgPromptId = `${shotBaseId}-img-prompt`;
      nodes.push({
        id: imgPromptId,
        type: "prompt",
        parentId: imgShotGroupId,
        data: {
          type: "IMAGE",
          segmentId: segment.id,
          schemaType: schema?.type,
          shotType: isProductShot ? "product" : ((shot as any).type ?? "generic"),
          shotIndex: shotIndex,
          promptText: shot.firstFramePrompt ?? segment.description,
          status: imgStatus,
          model: (shot as any).model ?? "gemini-2.5-flash-image",
          assets: schemaProductAssets.length > 0 ? schemaProductAssets : undefined,
          words: shot.words,
          display: shot.display,
          onUpdate: callbacks?.onUpdate,
          onGenerate: callbacks?.onGenerate,
        },
        style: { width: NODE_WIDTH, height: 560 },
        position: { x: 0, y: 0 },
      });

      const imgOutputId = `${shotBaseId}-img-output`;
      nodes.push({
        id: imgOutputId,
        type: "shotOutput",
        parentId: imgShotGroupId,
        data: {
          type: "IMAGE",
          segmentId: segment.id,
          shotIndex: shotIndex,
          outputUrl: imgUrl,
          status: imgStatus,
          promptText: shot.firstFramePrompt ?? segment.description,
          onGenerate: callbacks?.onGenerate,
        },
        style: { width: 340, height: 600 },
        position: { x: 0, y: 0 },
      });

      // Internal Edge: Prompt -> Output
      edges.push({
        id: `e-${imgPromptId}-${imgOutputId}`,
        source: imgPromptId,
        sourceHandle: "result",
        target: imgOutputId,
        targetHandle: "input",
        ...promptEdge(),
      });

      // External Edge: Product -> Prompt (REMOVED: Assumed connection)

      if (isVideoMode) {
        // --- 2. Video Shot Flow ---
        const vidShotGroupId = `${shotBaseId}-vid-group`;
        nodes.push({
          id: vidShotGroupId,
          type: "shotGroup",
          parentId: visualsGroupId,
          data: { id: vidShotGroupId, type: "VIDEO", index: shotIndex },
          style: {},
          position: { x: 0, y: 0 },
        });

        const vidUrl =
          shot.videoUrl ||
          (!multiShot && activeVidAsset?.url ? activeVidAsset.url : undefined);
        const isVidGenerating = generatingShots[`${segment.id}-${shotIndex}-vid`];
        let vidStatus = "idle";
        if (isVidGenerating || activeVidAsset?.status === "generating") vidStatus = "processing";
        else if (vidUrl) vidStatus = "success";
        else if (shot.status === "failed") vidStatus = "error";

        const vidPromptId = `${shotBaseId}-vid-prompt`;

        console.log("Video prompt node data:", {
          segmentId: segment.id,
          shotIndex: shotIndex,
          promptText: shot.videoPrompt ?? "",
          status: vidStatus,
          model: "luma-ray",
          mode: (shot as any).mode,
          firstFrameSource: (shot as any).firstFrameSource,
          assets: schema?.assets as any,
          shot,
        });
        nodes.push({
          id: vidPromptId,
          type: "prompt",
          parentId: vidShotGroupId,
          data: {
            type: "VIDEO",
            segmentId: segment.id,
            schemaType: schema?.type,
            shotIndex: shotIndex,
            promptText: shot.videoPrompt ?? "",
            status: vidStatus,
            model: "luma-ray",
            mode: (shot as any).mode,
            firstFrameSource: (shot as any).firstFrameSource,
            assets: schema?.assets as any,
            words: shot.words,
            display: shot.display,
            onUpdate: callbacks?.onUpdate,
            onGenerate: callbacks?.onGenerate,
          },
          style: { width: NODE_WIDTH, height: 560 },
          position: { x: 0, y: 0 },
        });

        const vidOutputId = `${shotBaseId}-vid-output`;
        nodes.push({
          id: vidOutputId,
          type: "shotOutput",
          parentId: vidShotGroupId,
          data: {
            type: "VIDEO",
            segmentId: segment.id,
            shotIndex: shotIndex,
            outputUrl: vidUrl,
            status: vidStatus,
            promptText: shot.videoPrompt ?? "",
            onGenerate: callbacks?.onGenerate,
          },
          style: { width: 340, height: 600 },
          position: { x: 0, y: 0 },
        });

        // Internal Edge: Prompt -> Output
        edges.push({
          id: `e-${vidPromptId}-${vidOutputId}`,
          source: vidPromptId,
          sourceHandle: "result",
          target: vidOutputId,
          targetHandle: "input",
          ...promptEdge(),
        });

        // Vertical Edge: Image Output -> Video Prompt
        edges.push({
          id: `e-${imgOutputId}-${vidPromptId}`,
          source: imgOutputId,
          sourceHandle: "result",
          target: vidPromptId,
          targetHandle: "asset",
          ...videoEdge(),
        });
      }
    });

    // Segment Output Node (External to all groups)
    const segmentOutputId = `seg-out-${segment.id}`;
    segmentOutputIds.push(segmentOutputId);

    nodes.push({
      id: segmentOutputId,
      type: "segmentOutput",
      data: {
        label: `Scene ${segmentIndex + 1}`,
        shotCount: shots.length,
        hasAudio: !!(segment.textToSpeech?.src || segment.audioUrl),
      },
      style: { width: 260, height: 320 },
      position: { x: 0, y: 0 },
    });

    // CONSOLIDATED CONNECTION: Scene Group -> Scene Output
    edges.push({
      id: `e-${segmentGroupId}-${segmentOutputId}`,
      source: segmentGroupId,
      sourceHandle: "right",
      target: segmentOutputId,
      targetHandle: "input",
      ...collectEdge(),
    });
  });

  // 4. Global Output Node
  const globalOutputId = "global-output";
  nodes.push({
    id: globalOutputId,
    type: "globalOutput",
    data: {
      segmentCount: segmentOutputIds.length,
    },
    style: { width: 320, height: 500 },
    position: { x: 0, y: 0 },
  });

  // Connect Segment Outputs to Global Output
  segmentOutputIds.forEach((segOutId) => {
    edges.push({
      id: `e-${segOutId}-${globalOutputId}`,
      source: segOutId,
      sourceHandle: "right",
      target: globalOutputId,
      targetHandle: "input",
      ...collectEdge(),
    });
  });

  return { nodes, edges };
};
