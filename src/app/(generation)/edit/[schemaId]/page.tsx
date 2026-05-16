"use client";

import { use, useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import Editor from "@/components/editor/editor";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { convertUgcSchemaToDesign } from "@/utils/ugc-schema-converter";
import { useSchemaStore } from "@/stores/schema-store";
import { Design } from "@/types/editor";
import { prepareDesignForEditor } from "@/lib/design-tracks";
import { Loading } from "@/components/editor/loading";

export default function FolderPage({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = use(params);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [design, setDesign] = useState<Design | undefined>(undefined);
  const [isOwner, setIsOwner] = useState(true);
  const { setSchema } = useSchemaStore();

  const [isGenerating, setIsGeneratingLocal] = useState(false);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching schema: ", { schemaId });
      const response = await fetch(`/api/scheme/${schemaId}`);
      if (!response.ok) throw new Error("Failed to fetch storyboard schema");

      const data = await response.json();
      const schema = data.scheme ?? data;

      const terminalStatuses = ["COMPLETED", "FAILED"];
      const isCurrentlyGenerating = !!data.message || !terminalStatuses.includes(data.status);
      setIsGeneratingLocal(isCurrentlyGenerating);

      // Store in global schema store
      setSchema(schema);

      if (!isCurrentlyGenerating) {
        setIsConverting(true);
        let exportedSchema: Design;
        if (schema?.type === "ugc-video-ad" || schema?.type === "character-driven-ad") {
          console.log("Using UGC schema converter");
          exportedSchema = await convertUgcSchemaToDesign(schema);
        } else {
          console.log("Using standard schema converter");
          exportedSchema = await convertSchemaToDesign(schema);
        }

        console.log({ exportedSchema, schema });
        setDesign(prepareDesignForEditor(exportedSchema));
        setIsConverting(false);
      }

      setIsOwner(data.isOwner ?? true);
    } catch (err) {
      console.error("Error fetching project:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   const convertAndSave = async () => {
  //     if (!projectData) return;

  //     const mainSchema = projectData.schemas?.[0];
  //     if (mainSchema) {
  //       setSchema({
  //         ...mainSchema,
  //         segments: projectData.segments || [],
  //       });
  //     }

  //     // 1. If scene exists, load it directly
  //     if (projectData.scene?.scene_data || projectData?.scene_data) {
  //       console.log("Loading existing scene:", projectData);

  //       const rawSceneData = projectData.scene?.scene_data ?? projectData?.scene_data;

  //       const sceneData =
  //         typeof rawSceneData === "string" ? JSON.parse(rawSceneData) : rawSceneData;

  //       setDesign(sceneData);
  //       return;
  //     }

  //     // 2. If no scene, convert schema and save
  //     try {
  //       setIsConverting(true);
  //       const mainSchema = projectData.schemas[0];
  //       const schemaWithSegments = {
  //         ...mainSchema,
  //         segments: projectData.segments,
  //       };
  //       console.log({ schemaWithSegments });

  //       let exportedSchema: Design;
  //       if (mainSchema?.type === "ugc-video-ad" || mainSchema?.type === "character-driven-ad") {
  //         console.log("Using UGC schema converter");
  //         exportedSchema = await convertUgcSchemaToDesign(schemaWithSegments);
  //       } else {
  //         console.log("Using standard schema converter");
  //         exportedSchema = await convertSchemaToDesign(schemaWithSegments);
  //       }

  //       console.log({ exportedSchema, projectData });
  //       setDesign(exportedSchema);

  //       // Save the generated scene
  //       await fetch("/api/scenes", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           schemaId,
  //           projectId: projectData.project.id,
  //           sceneData: exportedSchema,
  //         }),
  //       });

  //       setIsConverting(false);
  //     } catch (err) {
  //       console.error("Conversion or save failed:", err);
  //       setIsConverting(false);
  //     }
  //   };

  //   convertAndSave();
  // }, [projectData, schemaId]);

  useEffect(() => {
    fetchProject();
  }, [schemaId]);

  if (loading || isConverting) {
    return (
      <div className="absolute inset-0 z-100">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">Error: {error}</div>
    );
  }

  return (
    <Editor
      isDataLoading={isGenerating}
      initialDesign={design}
      // projectId={projectData?.project?.id}
      // projectName={projectData?.project?.name}
      // isOwner={isOwner}
    />
  );
}
