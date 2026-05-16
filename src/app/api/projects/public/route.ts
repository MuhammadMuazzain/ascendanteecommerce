import { projectQueries } from "@/lib/database/project-queries";
import { db } from "@/lib/database";

export async function GET() {
  try {
    const projects = await projectQueries.findPublicProjects();

    const enrichedProjects = projects.map((project: any) => {
      let aspectRatio: "9:16" | "16:9" | "1:1" = "9:16";

      const generationInput = project.generation_input as {
        aspectRatio?: "9:16" | "16:9" | "1:1";
      } | null;

      if (generationInput?.aspectRatio) {
        aspectRatio = generationInput.aspectRatio;
      }

      const status = project.generation_status || "PENDING";
      const thumbnail = project.thumbnail || project.generation_preview_url || null;

      return {
        ...project,
        thumbnail,
        aspectRatio,
        status,
      };
    });

    const mappedProjects = enrichedProjects
      .filter((project) => project.status === "COMPLETED" && project.scene_id)
      .map((project) => ({
        ...project,
        generationId: project.generation_id,
        sceneId: project.scene_id,
        // Remove backend-specific fields
        generation_status: undefined,
        generation_input: undefined,
        generation_output: undefined,
        generation_preview_url: undefined,
      }));

    return Response.json({
      projects: mappedProjects,
    });
  } catch (error) {
    console.error("Failed to fetch public projects:", error);
    return Response.json({ error: "Failed to fetch public projects" }, { status: 500 });
  }
}
