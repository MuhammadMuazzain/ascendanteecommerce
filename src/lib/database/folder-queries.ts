import { db } from "./index";
import { withDbRetry } from "./retry";
import type { Folder, NewFolder, FolderUpdate } from "./types";

export const folderQueries = {
  /**
   * Create a new folder
   */
  async create(data: NewFolder): Promise<Folder> {
    return await db
      .insertInto("folders")
      .values({
        ...data,
        user_id: data.user_id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get folder by ID
   */
  async findById(id: string): Promise<Folder | undefined> {
    return await db.selectFrom("folders").selectAll().where("id", "=", id).executeTakeFirst();
  },

  /**
   * List folders by user
   */
  async findByUserId(userId: string): Promise<Folder[]> {
    return await withDbRetry(() =>
      db.selectFrom("folders").selectAll().where("user_id", "=", userId).execute(),
    );
  },

  /**
   * Update a folder
   */
  async update(id: string, updates: FolderUpdate): Promise<Folder> {
    return await db
      .updateTable("folders")
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Delete a folder
   */
  async delete(id: string): Promise<void> {
    await db.deleteFrom("folders").where("id", "=", id).execute();
  },
};
