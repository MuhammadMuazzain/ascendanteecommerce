"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type Node,
  type Edge,
  BackgroundVariant,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import GlobalScriptNode from "./nodes/global-script-node";
import ProductNode from "./nodes/product-node";
import SegmentOutputNode from "./nodes/segment-output-node";
import GlobalOutputNode from "./nodes/global-output-node";
import SegmentGroupNode from "./nodes/segment-group-node";
import VisualsGroupNode from "./nodes/visuals-group-node";
import PromptNode from "./nodes/prompt-node";
import OutputNode from "./nodes/output-node";
import ShotGroupNode from "./nodes/shot-group-node";
import AvatarNode from "./nodes/avatar-node";
import ScriptNode from "./nodes/script-node";
import VoiceNode from "./nodes/voice-node";
import SegmentContentGroupNode from "./nodes/segment-content-group-node";

import { mapSchemaToFlow } from "./utils/flow-mapper";
import { getLayoutedElements } from "./utils/layout";
import { useStoryboardEditor } from "@/hooks/use-storyboard-editor";
import { useUGCGeneration } from "@/hooks/use-ugc-generation";
import { useShotGeneration } from "@/hooks/use-shot-generation";
import { useSchemaStore } from "@/stores/schema-store";

// Defined OUTSIDE the component so the reference is always stable.
// React Flow warns and re-registers all nodes if nodeTypes changes identity.
const nodeTypes = {
  globalScript: GlobalScriptNode,
  product: ProductNode,
  segmentOutput: SegmentOutputNode,
  globalOutput: GlobalOutputNode,
  segmentGroup: SegmentGroupNode,
  prompt: PromptNode,
  shotOutput: OutputNode,
  shotGroup: ShotGroupNode,
  visualsGroup: VisualsGroupNode,
  avatar: AvatarNode,
  script: ScriptNode,
  voice: VoiceNode,
  segmentContentGroup: SegmentContentGroupNode,
};

interface FlowViewProps {
  onReady?: () => void;
}

export default function FlowView({ onReady }: FlowViewProps) {
  const { schema, updateShot, updateSchema, updateSegment } = useStoryboardEditor();
  const { generatingShots } = useSchemaStore();

  const { handleGenerateUGCImage, handleGenerateUGCVideo } = useUGCGeneration();

  const { handleGenerateStandardImage, handleGenerateStandardVideo } = useShotGeneration();

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    console.log("generatingShots", generatingShots);
  }, [generatingShots]);

  const stableOnUpdate = useCallback(
    (id: string, updates: any) => {
      if (id === "global-script") {
        updateSchema({ script: updates.script });
        return;
      }

      const parts = id.split("-");

      if (parts[0] === "script") {
        const segId = parts.slice(1).join("-");
        updateSegment(segId, { text: updates.text });
        return;
      }

      if (parts[0] === "shot" || updates.segmentId) {
        const segId = updates.segmentId || parts[1];
        const shotIdx = updates.shotIndex !== undefined ? updates.shotIndex : parseInt(parts[2]);
        const mediaType =
          updates.mediaType || updates.type || (id.includes("-vid-") ? "vid" : "img");
        const isPromptUpdate = id.endsWith("prompt") || id.includes("-prompt");

        if (isPromptUpdate) {
          const field = mediaType === "vid" ? "videoPrompt" : "firstFramePrompt";
          const text = updates.text || updates.promptText;

          const {
            mediaType: _mediaType,
            type: _type,
            promptText: _promptText,
            segmentId: _segmentId,
            shotIndex: _shotIndex,
            text: _text,
            ...restUpdates
          } = updates;

          const shotUpdates = { ...restUpdates };
          if (text !== undefined) {
            shotUpdates[field] = text;
          }

          updateShot(segId, shotIdx, shotUpdates);
        }
      }
    },
    [updateSchema, updateSegment, updateShot],
  );

  const stableOnGenerate = useCallback(
    (
      segmentId: string,
      shotIndexStr: string,
      type: "IMAGE" | "VIDEO",
      model?: string,
      options?: { mode?: string; firstFrameSource?: string; shotType?: string },
    ) => {
      const schemaType = schema?.type || "";
      const isUGCProject = schemaType === "ugc-video-ad";
      if (isUGCProject) {
        if (type === "VIDEO") {
          handleGenerateUGCVideo(segmentId, options);
        } else {
          handleGenerateUGCImage(segmentId);
        }
      } else {
        if (type === "VIDEO") {
          handleGenerateStandardVideo(segmentId, shotIndexStr, type, model, options?.shotType);
        } else {
          handleGenerateStandardImage(segmentId, shotIndexStr, type, model, options?.shotType);
        }
      }
    },
    [
      schema?.type,
      handleGenerateStandardImage,
      handleGenerateStandardVideo,
      handleGenerateUGCImage,
      handleGenerateUGCVideo,
    ],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track last schema JSON and generatingShots to avoid re-mapping when only unrelated state changes
  const lastSchemaJsonRef = useRef<string>("");
  const lastGeneratingShotsRef = useRef<string>("");

  useEffect(() => {
    const nextJson = schema ? JSON.stringify(schema) : "";
    const nextGenJson = JSON.stringify(generatingShots);
    if (nextJson === lastSchemaJsonRef.current && nextGenJson === lastGeneratingShotsRef.current)
      return;

    lastSchemaJsonRef.current = nextJson;
    lastGeneratingShotsRef.current = nextGenJson;

    const { nodes: newNodes, edges: newEdges } = mapSchemaToFlow(schema, generatingShots, {
      onUpdate: stableOnUpdate,
      onGenerate: stableOnGenerate,
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [schema, generatingShots, setNodes, setEdges, stableOnUpdate, stableOnGenerate]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Logic for selecting node if needed
  }, []);

  return (
    <div className="w-full h-full relative bg-black">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        className="[&_.react-flow__node]:p-0"
        style={{ "--xy-background-color": "#111111" } as React.CSSProperties}
        defaultEdgeOptions={{
          type: "default",
          style: { strokeWidth: 1.5, stroke: "#4f4f7a", opacity: 0.85 },
          markerEnd: {
            type: "arrowclosed",
            width: 14,
            height: 14,
            color: "#4f4f7a",
          },
        }}
        minZoom={0.001}
        panOnDrag={false}
        selectionOnDrag={true}
        panOnScroll={true}
        selectionMode={SelectionMode.Partial}
        panActivationKeyCode="Space"
        // Performance: skip rendering nodes/edges outside the viewport
        onlyRenderVisibleElements
        // Performance: disable per-node accessibility focus listeners
        nodesFocusable={false}
        edgesFocusable={false}
        // Performance: avoid recomputing z-index on every edge select
        elevateEdgesOnSelect={false}
        // Performance: skip costly attribution badge
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Cross} gap={50} size={2} color="#555555" />
        <Controls
          showFitView={false}
          showInteractive={false}
          className="bg-card/80 backdrop-blur-md border-border/50 shadow-2xl fill-foreground rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
