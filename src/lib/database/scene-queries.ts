import { db } from "./index";
import { NewScene, Scene, SceneUpdate } from "./types";

export const sceneQueries = {
  /**
   * Create a new scene
   */
  async create(data: NewScene): Promise<Scene> {
    return await db.insertInto("scenes").values(data).returningAll().executeTakeFirstOrThrow();
  },

  /**
   * Find scene by schema ID
   */
  async findBySchemaId(schemaId: string): Promise<Scene | undefined> {
    return await db
      .selectFrom("scenes")
      .selectAll()
      .where("schema_id", "=", schemaId)
      .executeTakeFirst();
  },

  /**
   * Update a scene
   */
  async update(id: string, updates: SceneUpdate): Promise<Scene> {
    return await db
      .updateTable("scenes")
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Find scene by ID
   */
  async findById(id: string): Promise<Scene | undefined> {
    return await db.selectFrom("scenes").selectAll().where("id", "=", id).executeTakeFirst();
  },
};
