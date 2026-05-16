import { projectQueries } from "@/lib/database/project-queries";
import { segmentQueries } from "@/lib/database/segment-queries";

export const ensureObject = (val: any) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

/**
 * Common state-fetching logic for Inngest orchestrators.
 * Consolidates the repetitive step of fetching project, schema, and segments.
 */
export async function fetchWorkflowState(schemeId: string) {
  const project = await projectQueries.findByGenerationId(schemeId);
  if (!project) throw new Error("Project not found");

  const schema = await segmentQueries.findSchemaByProjectId(project.id);
  if (!schema) throw new Error("Schema not found");

  const segments = await segmentQueries.findSegmentsBySchemaId(schema.id);

  return {
    projectId: project.id,
    userId: project.user_id,
    schemaId: schema.id,
    dbSchema: schema,
    dbSegments: segments.sort((a, b) => a.order - b.order),
  };
}

/**
 * Reconstructs media metadata from scheme segments for audio/visual alignment.
 */
export const getMediaMetadata = (segments: any[]) => {
  const metadata: Record<string, any> = {};
  segments.forEach((s) => {
    if (s.textToSpeech?.src && s.speechToText?.src) {
      metadata[s.id] = {
        audioUrl: s.textToSpeech.src,
        captionUrl: s.speechToText.src,
        duration: s.textToSpeech.duration || (s.estimatedDuration || 0) * 1000,
        startPause: s.textToSpeech.startPause || 0,
        endPause: s.textToSpeech.endPause || 0,
      };
    }
  });
  return metadata;
};
