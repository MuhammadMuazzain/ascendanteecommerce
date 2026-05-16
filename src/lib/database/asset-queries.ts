import { db } from "./index";
import type { Asset, NewAsset, AssetUpdate } from "./types";

export const assetQueries = {
  async create(asset: NewAsset): Promise<Asset> {
    return await db.insertInto("assets").values(asset).returningAll().executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<Asset | null> {
    return await db
      .selectFrom("assets")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst()
      .then((result) => result || null);
  },

  async findByUserId(userId: string): Promise<Asset[]> {
    return await db
      .selectFrom("assets")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc")
      .execute();
  },

  async findByProjectId(projectId: string): Promise<Asset[]> {
    return await db
      .selectFrom("assets")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("created_at", "desc")
      .execute();
  },

  async update(id: string, updateData: AssetUpdate): Promise<Asset> {
    return await db
      .updateTable("assets")
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async delete(id: string): Promise<void> {
    await db.deleteFrom("assets").where("id", "=", id).execute();
  },
};
