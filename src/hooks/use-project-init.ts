"use client";

import { useEffect, useState, useCallback } from "react";
import { useSchemaStore } from "@/stores/schema-store";
import { useProjectStore } from "@/stores/project-store";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { convertUgcSchemaToDesign } from "@/utils/ugc-schema-converter";
import { Design } from "@/types/editor";
import { prepareDesignForEditor } from "@/lib/design-tracks";

interface UseProjectInitOptions {
  generationId?: string;
  schemaId?: string;
}

export function useProjectInit({ generationId, schemaId }: UseProjectInitOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const { setSchema, setAvatarUrl, setProductUrls, setIsGenerating } = useSchemaStore();
  const { setInitialStudioJSON, setProjectName } = useProjectStore();

  const fetchByGenerationId = useCallback(
    async (id: string, silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        const response = await fetch(`/api/scheme/${id}`);
        if (!response.ok) throw new Error("Failed to fetch storyboard schema");

        const data = await response.json();
        const schema = data.scheme ?? data;

        const terminalStatuses = ["COMPLETED", "FAILED"];
        const isCurrentlyGenerating = !!data.message || !terminalStatuses.includes(data.status);
        setIsGenerating(isCurrentlyGenerating);

        if (schema.segments?.length) {
          setSchema(schema);
          if (schema.avatar?.url) setAvatarUrl(schema.avatar.url);
          if (schema.assets && Array.isArray(schema.assets)) {
            setProductUrls(schema.assets.map((a: any) => a.url));
          }
        }
        setIsLoading(false);
        return {
          schema,
          isOwner: data.isOwner ?? true,
          projectId: data.project?.id,
          projectName: data.project?.name,
          schemaId: schema.schemaId ?? data.schemaId,
        };
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
        return null;
      }
    },
    [setSchema, setAvatarUrl, setProductUrls, setIsGenerating],
  );

  const fetchBySchemaId = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/schemas/${id}`);
        if (!response.ok) throw new Error("Failed to fetch project data");

        const data = await response.json();
        const mainSchema = data.schemas?.[0];
        if (mainSchema) {
          setSchema({
            ...mainSchema,
            segments: data.segments || [],
          });
        }
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
        return null;
      }
    },
    [setSchema],
  );

  const convertAndLoad = useCallback(
    async (projectData: any, id: string) => {
      if (!projectData) return;

      // If scene exists, load it directly
      if (projectData.scene?.scene_data || projectData?.scene_data) {
        const rawSceneData = projectData.scene?.scene_data ?? projectData?.scene_data;
        const sceneData =
          typeof rawSceneData === "string" ? JSON.parse(rawSceneData) : rawSceneData;
        setInitialStudioJSON(prepareDesignForEditor(sceneData as Design));
        return;
      }

      // Otherwise convert
      try {
        setIsConverting(true);
        const mainSchema = projectData.schemas
          ? projectData.schemas[0]
          : (projectData.schema ?? projectData);
        const schemaWithSegments = {
          ...mainSchema,
          segments: projectData.segments || mainSchema.segments,
        };

        let exportedSchema: Design;
        if (mainSchema?.type === "ugc-video-ad" || mainSchema?.type === "character-driven-ad") {
          exportedSchema = await convertUgcSchemaToDesign(schemaWithSegments);
        } else {
          exportedSchema = await convertSchemaToDesign(schemaWithSegments);
        }

        setInitialStudioJSON(prepareDesignForEditor(exportedSchema));
      } catch (err) {
        console.error("Conversion failed:", err);
      } finally {
        setIsConverting(false);
      }
    },
    [setInitialStudioJSON],
  );

  return {
    isLoading,
    isConverting,
    error,
    fetchByGenerationId,
    fetchBySchemaId,
    convertAndLoad,
  };
}
