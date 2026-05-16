import { db } from "./index";
import type { Project, NewProject, ProjectUpdate } from "./types";

export const projectQueries = {
  /**
   * Create a new project
   */
  async create(data: NewProject): Promise<Project> {
    return await db
      .insertInto("projects")
      .values({
        ...data,
        user_id: data.user_id,
        type: data.type,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get project by ID with generation data
   */
  async findById(id: string): Promise<any | undefined> {
    return await db
      .selectFrom("projects")
      .leftJoin("generations", "projects.generation_id", "generations.id")
      .select([
        "projects.id",
        "projects.name",
        "projects.type",
        "projects.description",
        "projects.thumbnail",
        "projects.public",
        "projects.user_id",
        "projects.folder_id",
        "projects.generation_id",
        "projects.scene_id",
        "projects.created_at",
        "projects.updated_at",
        "generations.status as generation_status",
        "generations.preview_url as generation_preview_url",
        "generations.input as generation_input",
        "generations.output as generation_output",
        "generations.metadata as generation_metadata",
      ])
      .where("projects.id", "=", id)
      .executeTakeFirst();
  },

  /**
   * List projects by user with generation data
   */
  async findByUserId(userId: string): Promise<any[]> {
    return await db
      .selectFrom("projects")
      .leftJoin("generations", "projects.generation_id", "generations.id")
      .select([
        "projects.id",
        "projects.name",
        "projects.type",
        "projects.description",
        "projects.thumbnail",
        "projects.public",
        "projects.user_id",
        "projects.folder_id",
        "projects.generation_id",
        "projects.scene_id",
        "projects.created_at",
        "projects.updated_at",
        "generations.status as generation_status",
        "generations.preview_url as generation_preview_url",
        "generations.input as generation_input",
        "generations.output as generation_output",
        "generations.metadata as generation_metadata",
      ])
      .where("projects.user_id", "=", userId)
      .execute();
  },

  /**
   * List projects by folder with generation data
   */
  async findByFolderId(folderId: string): Promise<any[]> {
    return await db
      .selectFrom("projects")
      .leftJoin("generations", "projects.generation_id", "generations.id")
      .select([
        "projects.id",
        "projects.name",
        "projects.type",
        "projects.description",
        "projects.thumbnail",
        "projects.public",
        "projects.user_id",
        "projects.folder_id",
        "projects.generation_id",
        "projects.scene_id",
        "projects.created_at",
        "projects.updated_at",
        "generations.status as generation_status",
        "generations.preview_url as generation_preview_url",
        "generations.input as generation_input",
        "generations.output as generation_output",
        "generations.metadata as generation_metadata",
      ])
      .where("projects.folder_id", "=", folderId)
      .execute();
  },

  /**
   * List projects without folder (in root) with generation data
   */
  async findRootProjects(userId: string): Promise<any[]> {
    return await db
      .selectFrom("projects")
      .leftJoin("generations", "projects.generation_id", "generations.id")
      .select([
        "projects.id",
        "projects.name",
        "projects.type",
        "projects.description",
        "projects.thumbnail",
        "projects.public",
        "projects.user_id",
        "projects.folder_id",
        "projects.generation_id",
        "projects.scene_id",
        "projects.created_at",
        "projects.updated_at",
        "generations.status as generation_status",
        "generations.preview_url as generation_preview_url",
        "generations.input as generation_input",
        "generations.output as generation_output",
        "generations.metadata as generation_metadata",
      ])
      .where("projects.user_id", "=", userId)
      .where("projects.folder_id", "is", null)
      .execute();
  },

  /**
   * Update a project
   */
  async update(id: string, updates: ProjectUpdate): Promise<Project> {
    return await db
      .updateTable("projects")
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Move project to folder (or remove from folder)
   */
  async moveToFolder(projectId: string, folderId: string | null): Promise<Project> {
    return await db
      .updateTable("projects")
      .set({
        folder_id: folderId,
        updated_at: new Date(),
      })
      .where("id", "=", projectId)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * List all public projects
   */
  async findPublicProjects(): Promise<any[]> {
    return await db
      .selectFrom("projects")
      .leftJoin("generations", "projects.generation_id", "generations.id")
      .select([
        "projects.id",
        "projects.name",
        "projects.type",
        "projects.description",
        "projects.thumbnail",
        "projects.public",
        "projects.user_id",
        "projects.folder_id",
        "projects.generation_id",
        "projects.scene_id",
        "projects.created_at",
        "projects.updated_at",
        "generations.status as generation_status",
        "generations.input as generation_input",
        "generations.output as generation_output",
        "generations.preview_url as generation_preview_url",
        "generations.metadata as generation_metadata",
      ])
      .where("projects.public", "=", true)
      .orderBy("projects.created_at", "desc")
      .execute();
  },

  /**
   * Delete a project and its associated resources
   */
  async delete(id: string): Promise<void> {
    const project = await this.findById(id);
    if (!project) return;

    await db.transaction().execute(async (trx) => {
      // Delete associated scenes
      if (project.scene_id) {
        await trx.deleteFrom("scenes").where("id", "=", project.scene_id).execute();
      }

      // Delete associated generations
      if (project.generation_id) {
        await trx.deleteFrom("generations").where("id", "=", project.generation_id).execute();
      }

      // Delete the project
      await trx.deleteFrom("projects").where("id", "=", id).execute();
    });
  },

  /**
   * Find project by generation ID with generation data
   */
  async findByGenerationId(generationId: string): Promise<any | undefined> {
    return await db
      .selectFrom("projects")
      .leftJoin("generations", "projects.generation_id", "generations.id")
      .select([
        "projects.id",
        "projects.name",
        "projects.type",
        "projects.description",
        "projects.thumbnail",
        "projects.public",
        "projects.user_id",
        "projects.folder_id",
        "projects.generation_id",
        "projects.scene_id",
        "projects.created_at",
        "projects.updated_at",
        "generations.status as generation_status",
        "generations.preview_url as generation_preview_url",
        "generations.input as generation_input",
        "generations.output as generation_output",
        "generations.metadata as generation_metadata",
      ])
      .where("projects.generation_id", "=", generationId)
      .executeTakeFirst();
  },
};
