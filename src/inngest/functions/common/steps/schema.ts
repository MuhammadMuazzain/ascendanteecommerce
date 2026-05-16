import { nanoid } from "nanoid";
import { db } from "@/lib/database";
import { segmentQueries } from "@/lib/database/segment-queries";
import { projectQueries } from "@/lib/database/project-queries";
import generateSchema from "@/lib/schema-generator";
import { ResolverStatus } from "@/utils/enum";
import { ensureObject } from "../services/utils";

export const generateInitialSchema = async (scheme: any) => {
  return generateSchema({
    script: scheme.script || "",
    aspectRatio: scheme.aspectRatio,
    voice: scheme.voice as any,
    visuals: scheme.visuals,
    music: scheme.music,
    caption: scheme.caption,
    animation: scheme.animation,
    assets: scheme.assets,
    avatar: scheme.avatar,
    topic: scheme?.product,
    description: scheme?.description,
    pacing: scheme?.pacing,
  });
};

export const mergeSegments = async (generatedSchema: any) => {
  const segments = generatedSchema.segments;
  if (!segments || segments.length === 0) return { segments: [] };

  const estimateDuration = (text: string) => {
    // Standard speech rate: ~20 characters per second (including spaces)
    return text.length / 20;
  };

  // For a single segment, just annotate with estimated duration and return early
  if (segments.length === 1) {
    return {
      segments: [{ ...segments[0], estimatedDuration: estimateDuration(segments[0].text) }],
    };
  }

  const MAX_DURATION = 8.0;
  const result: any[] = [];
  let current: any = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentDuration = estimateDuration(segment.text);
    if (!current) {
      current = {
        ...segment,
        estimatedDuration: segmentDuration,
      };
      continue;
    }

    const combinedText = `${current.text} ${segment.text}`.trim();
    const combinedDuration = current.estimatedDuration + segmentDuration;

    // Fully permissive merge: merge as long as duration allows (8s)
    const shouldMerge = combinedDuration <= MAX_DURATION;

    if (shouldMerge) {
      current.text = combinedText;
      current.description = `${current.description} ${segment.description}`.trim();
      current.title = `${current.title} & ${segment.title}`;
      current.tags = Array.from(new Set([...current.tags, ...segment.tags])).slice(0, 5);
      current.mergeWithNext = segment.mergeWithNext;
      current.estimatedDuration = combinedDuration;
    } else {
      result.push(current);
      current = {
        ...segment,
        estimatedDuration: segmentDuration,
      };
    }
  }

  if (current) result.push(current);

  console.log(`Segment merging: ${segments.length} → ${result.length} segments`);
  return { segments: result };
};

export const saveSchema = async (
  schemeId: string,
  scheme: any,
  status: ResolverStatus = ResolverStatus.COMPLETED,
) => {
  const project = await projectQueries.findByGenerationId(schemeId);
  if (!project) throw new Error(`Project not found for generation ${schemeId}`);

  // Check for existing schema
  const existingSchema = await segmentQueries.findSchemaByProjectId(project.id);
  const schemaId = existingSchema?.id || nanoid();

  const toJSONB = (val: any) => {
    const obj = ensureObject(val);
    return obj ? JSON.stringify(obj) : null;
  };

  const schemaData = {
    title: scheme.title || null,
    description: scheme.description || null,
    prompt_preview: scheme.promptPreview || null,
    tags: scheme.tags || null,
    music: toJSONB(scheme.music),
    voice: toJSONB(scheme.voice),
    visuals: toJSONB(scheme.visuals),
    caption: toJSONB(scheme.caption),
    resolution: scheme.resolution || null,
    aspect_ratio: scheme.aspectRatio || null,
    execution_mode: scheme.executionMode || "live",
    type: scheme.type,
    avatar: toJSONB(scheme.avatar),
    assets: toJSONB(scheme.assets),
    script: scheme.script || null,
    pacing: scheme.pacing || null,
    metadata: toJSONB({ animation: scheme.animation }),
  };

  if (existingSchema) {
    console.log(`Updating existing schema: ${schemaId}`);
    await segmentQueries.updateSchema(schemaId, schemaData);
    // Delete existing segments before recreation to avoid conflicts
    await segmentQueries.deleteBySchemaId(schemaId);
  } else {
    console.log(`Creating new schema: ${schemaId}`);
    await segmentQueries.createSchema({
      id: schemaId,
      project_id: project.id,
      ...schemaData,
    });
  }

  await segmentQueries.bulkCreateSegments(
    scheme.segments.map((s: any, index: number) => ({
      id: s.id,
      project_id: project.id,
      schema_id: schemaId,
      order: index,
      segment_data: s,
    })),
  );

  await db
    .updateTable("generations")
    .set({
      input: JSON.stringify(scheme),
      output: JSON.stringify(scheme),
      metadata: { title: scheme.title },
      status: status as any,
      // Only update progress if it's currently low or completing
      progress: status === ResolverStatus.COMPLETED ? 100 : 33,
    } as any)
    .where("id", "=", schemeId)
    .execute();

  return { scheme, schemaId, projectId: project.id, project };
};
