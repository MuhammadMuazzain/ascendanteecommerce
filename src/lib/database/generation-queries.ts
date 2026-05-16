import { db } from "./index";
import type { Generation, NewGeneration, GenerationUpdate } from "./types";

export const generationQueries = {
  /**
   * Crear un nuevo generation
   */
  async create(data: NewGeneration): Promise<Generation> {
    return await db.insertInto("generations").values(data).returningAll().executeTakeFirstOrThrow();
  },

  /**
   * Obtener generation por ID
   */
  async findById(id: string): Promise<Generation | undefined> {
    return await db.selectFrom("generations").selectAll().where("id", "=", id).executeTakeFirst();
  },

  /**
   * Listar generations por usuario
   */
  async findByUserId(userId: string): Promise<Generation[]> {
    return await db.selectFrom("generations").selectAll().where("user_id", "=", userId).execute();
  },

  /**
   * Actualizar un generation
   */
  async update(id: string, updates: GenerationUpdate): Promise<Generation> {
    return await db
      .updateTable("generations")
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Eliminar un generation
   */
  async delete(id: string): Promise<void> {
    await db.deleteFrom("generations").where("id", "=", id).execute();
  },

  /**
   * Find active generations (PENDING or PROGRESS) for a user
   */
  async findActiveGenerations(userId: string): Promise<Generation[]> {
    return await db
      .selectFrom("generations")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "in", ["PENDING", "PROGRESS"])
      .orderBy("created_at", "desc")
      .execute();
  },
};
