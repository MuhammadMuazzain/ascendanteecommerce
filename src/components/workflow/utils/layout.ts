import { Node, Edge } from "@xyflow/react";

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_GAP = 280; // horizontal gap between columns
const ROW_GAP = 160; // vertical gap between segment rows
const GROUP_PAD = { top: 100, right: 80, bottom: 80, left: 80 };
const VISUALS_PAD = { top: 60, right: 60, bottom: 60, left: 60 };
const SHOT_PAD = { top: 80, right: 40, bottom: 80, left: 40 };
const INTERNAL_GAP = 180; // gap between nodes inside a group

// ── Helpers ───────────────────────────────────────────────────────────────────
function nodeW(n: Node): number {
  return typeof n.style?.width === "number"
    ? n.style.width
    : parseInt(String(n.style?.width || 400));
}
function nodeH(n: Node): number {
  return typeof n.style?.height === "number"
    ? n.style.height
    : parseInt(String(n.style?.height || 420));
}

type Rect = { x: number; y: number; w: number; h: number };

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } => {
  const rects = new Map<string, Rect>();
  const childrenOf = new Map<string, Node[]>();

  nodes.forEach((n) => {
    if (n.parentId) {
      const children = childrenOf.get(n.parentId) || [];
      children.push(n);
      childrenOf.set(n.parentId, children);
    }
  });

  // --- Step 0: Measure ShotGroups (Prompt + Output) ---
  const shotGroupSizes = new Map<string, { w: number; h: number }>();
  nodes
    .filter((n) => n.type === "shotGroup")
    .forEach((sg) => {
      const children = childrenOf.get(sg.id) || [];
      const prompt = children.find((c) => c.type === "prompt");
      const output = children.find((c) => c.type === "shotOutput");

      const w =
        SHOT_PAD.left +
        (prompt ? nodeW(prompt) : 0) +
        (output ? INTERNAL_GAP + nodeW(output) : 0) +
        SHOT_PAD.right;
      const h =
        SHOT_PAD.top +
        Math.max(prompt ? nodeH(prompt) : 0, output ? nodeH(output) : 0) +
        SHOT_PAD.bottom;

      shotGroupSizes.set(sg.id, { w, h });

      // Position children of ShotGroup
      if (prompt) {
        rects.set(prompt.id, {
          x: SHOT_PAD.left,
          y: SHOT_PAD.top,
          w: nodeW(prompt),
          h: nodeH(prompt),
        });
      }
      if (output) {
        rects.set(output.id, {
          x: SHOT_PAD.left + (prompt ? nodeW(prompt) + INTERNAL_GAP : 0),
          y: SHOT_PAD.top,
          w: nodeW(output),
          h: nodeH(output),
        });
      }
    });

  // --- Step 1: Measure VisualsGroups (Grid of ShotGroups) ---
  const visualsGroupSizes = new Map<
    string,
    {
      w: number;
      h: number;
      shotsMap: Map<number, { img?: Node; vid?: Node }>;
      row1H: number;
      row2H: number;
      totalGridW: number;
    }
  >();

  nodes
    .filter((n) => n.type === "visualsGroup")
    .forEach((visG) => {
      const children = childrenOf.get(visG.id) || [];

      // Group shotGroups by their "shot index"
      const shotsMap = new Map<number, { img?: Node; vid?: Node }>();
      children.forEach((sn) => {
        const shotIdx = Number(sn.data?.index ?? 0);
        const isVid = sn.data?.type === "VIDEO";
        const entry = shotsMap.get(shotIdx) || {};
        if (isVid) entry.vid = sn;
        else entry.img = sn;
        shotsMap.set(shotIdx, entry);
      });

      const sortedShotIndices = Array.from(shotsMap.keys()).sort((a, b) => a - b);

      let totalGridW = 0;
      let row1H = 0;
      let row2H = 0;

      sortedShotIndices.forEach((idx, i) => {
        const { img, vid } = shotsMap.get(idx)!;
        const imgSize = img ? shotGroupSizes.get(img.id)! : { w: 0, h: 0 };
        const vidSize = vid ? shotGroupSizes.get(vid.id)! : { w: 0, h: 0 };

        const colW = Math.max(imgSize.w, vidSize.w);
        totalGridW += colW + (i > 0 ? INTERNAL_GAP : 0);

        row1H = Math.max(row1H, imgSize.h);
        row2H = Math.max(row2H, vidSize.h);
      });

      const w = VISUALS_PAD.left + totalGridW + VISUALS_PAD.right;
      const h = VISUALS_PAD.top + row1H + (row2H > 0 ? ROW_GAP + row2H : 0) + VISUALS_PAD.bottom;

      visualsGroupSizes.set(visG.id, { w, h, shotsMap, row1H, row2H, totalGridW });
    });

  // --- Step 1.5: Measure SegmentContentGroups (Script + Voice) ---
  const CONTENT_PAD = { top: 80, right: 60, bottom: 60, left: 60 };
  const contentGroupSizes = new Map<string, { w: number; h: number }>();

  nodes
    .filter((n) => n.type === "segmentContentGroup")
    .forEach((cg) => {
      const children = childrenOf.get(cg.id) || [];
      const scriptNode = children.find((c) => c.type === "script");
      const voiceNode = children.find((c) => c.type === "voice");

      const scriptW = scriptNode ? nodeW(scriptNode) : 0;
      const voiceW = voiceNode ? nodeW(voiceNode) : 0;
      const totalContentW = scriptW + (voiceW > 0 ? INTERNAL_GAP + voiceW : 0);
      const maxH = Math.max(scriptNode ? nodeH(scriptNode) : 0, voiceNode ? nodeH(voiceNode) : 0);

      const w = CONTENT_PAD.left + totalContentW + CONTENT_PAD.right;
      const h = CONTENT_PAD.top + maxH + CONTENT_PAD.bottom;

      contentGroupSizes.set(cg.id, { w, h });

      // Position Script inside ContentGroup
      if (scriptNode) {
        rects.set(scriptNode.id, {
          x: CONTENT_PAD.left,
          y: CONTENT_PAD.top + (maxH - nodeH(scriptNode)) / 2,
          w: scriptW,
          h: nodeH(scriptNode),
        });
      }
      // Position Voice to the right of Script
      if (voiceNode) {
        rects.set(voiceNode.id, {
          x: CONTENT_PAD.left + scriptW + (scriptW > 0 ? INTERNAL_GAP : 0),
          y: CONTENT_PAD.top + (maxH - nodeH(voiceNode)) / 2,
          w: voiceW,
          h: nodeH(voiceNode),
        });
      }
    });

  // --- Step 2: Measure Segment Groups ---
  const segmentGroupSizes = new Map<string, { w: number; h: number }>();

  nodes
    .filter((n) => n.type === "segmentGroup")
    .forEach((segG) => {
      const children = childrenOf.get(segG.id) || [];
      const contentGroup = children.find((c) => c.type === "segmentContentGroup");
      const visualsGroup = children.find((c) => c.type === "visualsGroup");

      const cgSize = contentGroup ? contentGroupSizes.get(contentGroup.id)! : { w: 0, h: 0 };
      const visGSize = visualsGroup ? visualsGroupSizes.get(visualsGroup.id)! : { w: 0, h: 0 };

      const totalW =
        GROUP_PAD.left +
        cgSize.w +
        (visGSize.w > 0 ? INTERNAL_GAP + visGSize.w : 0) +
        GROUP_PAD.right;
      const totalH = GROUP_PAD.top + Math.max(cgSize.h, visGSize.h) + GROUP_PAD.bottom;

      segmentGroupSizes.set(segG.id, { w: totalW, h: totalH });

      // Position ContentGroup inside SegmentGroup
      if (contentGroup) {
        rects.set(contentGroup.id, {
          x: GROUP_PAD.left,
          y: (totalH - cgSize.h) / 2,
          w: cgSize.w,
          h: cgSize.h,
        });
      }

      if (visualsGroup) {
        const visY = (totalH - visGSize.h) / 2;
        rects.set(visualsGroup.id, {
          x: GROUP_PAD.left + cgSize.w + INTERNAL_GAP,
          y: visY,
          w: visGSize.w,
          h: visGSize.h,
        });

        // Position children of VisualsGroup (ShotGroups)
        const { shotsMap, row1H, row2H } = visualsGroupSizes.get(visualsGroup.id)!;
        const sortedShotIndices = Array.from(shotsMap.keys()).sort((a, b) => a - b);

        let curX = VISUALS_PAD.left;
        sortedShotIndices.forEach((idx) => {
          const { img, vid } = shotsMap.get(idx)!;
          const imgSize = img ? shotGroupSizes.get(img.id)! : { w: 0, h: 0 };
          const vidSize = vid ? shotGroupSizes.get(vid.id)! : { w: 0, h: 0 };
          const colW = Math.max(imgSize.w, vidSize.w);

          if (img) {
            rects.set(img.id, {
              x: curX + (colW - imgSize.w) / 2,
              y: VISUALS_PAD.top + (row1H - imgSize.h) / 2,
              w: imgSize.w,
              h: imgSize.h,
            });
          }

          if (vid) {
            rects.set(vid.id, {
              x: curX + (colW - vidSize.w) / 2,
              y: VISUALS_PAD.top + row1H + ROW_GAP + (row2H - vidSize.h) / 2,
              w: vidSize.w,
              h: vidSize.h,
            });
          }

          curX += colW + INTERNAL_GAP;
        });
      }
    });

  // --- Step 3: Global Positioning ---
  const globalScript = nodes.find((n) => n.id === "global-script")!;
  const globalProducts = nodes.find((n) => n.id === "global-products");
  const globalAvatar = nodes.find((n) => n.id === "global-avatar");
  const globalOutput = nodes.find((n) => n.id === "global-output")!;

  const xGlobal = 0;
  const xSegments = xGlobal + nodeW(globalScript) + COL_GAP * 2;

  const sortedSegments = nodes
    .filter((n) => n.type === "segmentGroup")
    .sort((a, b) => Number(a.data?.index || 0) - Number(b.data?.index || 0));

  let currentY = 0;
  let maxRowW = 0;

  sortedSegments.forEach((segG) => {
    const size = segmentGroupSizes.get(segG.id)!;
    rects.set(segG.id, { ...rects.get(segG.id)!, x: xSegments, y: currentY, w: size.w, h: size.h });
    maxRowW = Math.max(maxRowW, size.w);
    currentY += size.h + ROW_GAP;
  });

  const totalH = currentY - ROW_GAP;
  const xOutput = xSegments + maxRowW + COL_GAP;

  sortedSegments.forEach((segG) => {
    const segId = segG.id.replace("segment-group-", "");
    const segOut = nodes.find((n) => n.id === `seg-out-${segId}`);
    if (segOut) {
      const segRect = rects.get(segG.id)!;
      rects.set(segOut.id, {
        x: xOutput,
        y: segRect.y + (segRect.h - nodeH(segOut)) / 2,
        w: nodeW(segOut),
        h: nodeH(segOut),
      });
    }
  });

  rects.set(globalScript.id, {
    x: xGlobal,
    y: (totalH - nodeH(globalScript)) / 2,
    w: nodeW(globalScript),
    h: nodeH(globalScript),
  });
  if (globalProducts) {
    rects.set(globalProducts.id, {
      x: xGlobal,
      y: (totalH - nodeH(globalScript)) / 2 + nodeH(globalScript) + COL_GAP,
      w: nodeW(globalProducts),
      h: nodeH(globalProducts),
    });
  }

  if (globalAvatar) {
    // If we have products, place avatar below it, otherwise place below global script
    const prevNode = globalProducts || globalScript;
    const prevRect = rects.get(prevNode.id)!;
    rects.set(globalAvatar.id, {
      x: xGlobal,
      y: prevRect.y + prevRect.h + COL_GAP,
      w: nodeW(globalAvatar),
      h: nodeH(globalAvatar),
    });
  }
  rects.set(globalOutput.id, {
    x: xOutput + 260 + COL_GAP,
    y: (totalH - nodeH(globalOutput)) / 2,
    w: nodeW(globalOutput),
    h: nodeH(globalOutput),
  });

  return {
    nodes: nodes.map((n) => {
      const r = rects.get(n.id);
      if (!r) return n;
      return {
        ...n,
        position: { x: r.x, y: r.y },
        style: { ...n.style, width: r.w, height: r.h },
      };
    }),
    edges,
  };
};
