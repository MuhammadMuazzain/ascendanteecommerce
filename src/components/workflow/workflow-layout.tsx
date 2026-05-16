"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Header from "./header";
import { Loading } from "@/components/editor/loading";
import { GenerationProgressBanner } from "./generation-progress-banner";
import { useSchemaStore } from "@/stores/schema-store";
import FlowView from "./flow-view";

export default function WorkflowLayout() {
  const params = useParams();
  const generationId = (params.id || params.schemaId || params.projectId) as string;
  const { schema, isGenerating } = useSchemaStore();

  const [isReady, setIsReady] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-50">
          <Loading />
        </div>
      )}
      <Header />
      {isGenerating && generationId && <GenerationProgressBanner generationId={generationId} />}
      <div className="flex-1 min-h-0 min-w-0 flex">
        <FlowView onReady={() => setIsReady(true)} />
      </div>
    </div>
  );
}
