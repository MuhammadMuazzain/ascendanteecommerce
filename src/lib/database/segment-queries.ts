import { db } from "./index";
import type {
  VideoSchemaDb,
  NewVideoSchemaDb,
  VideoSchemaDbUpdate,
  DbSegment,
  NewSegment,
  SegmentUpdate,
} from "./types";

export const segmentQueries = {
  /**
   * Project Schemas
   */
  async createSchema(schema: NewVideoSchemaDb): Promise<VideoSchemaDb> {
    return await db.insertInto("schemas").values(schema).returningAll().executeTakeFirstOrThrow();
  },

  async updateSchema(id: string, updates: VideoSchemaDbUpdate): Promise<VideoSchemaDb> {
    return await db
      .updateTable("schemas")
      .set(updates)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async findSchemaByProjectId(projectId: string): Promise<VideoSchemaDb | undefined> {
    return await db
      .selectFrom("schemas")
      .selectAll()
      .where("project_id", "=", projectId)
      .executeTakeFirst();
  },

  async findSchemaById(schemaId: string): Promise<VideoSchemaDb | undefined> {
    return await db.selectFrom("schemas").selectAll().where("id", "=", schemaId).executeTakeFirst();
  },

  async findAllSchemasByProjectId(projectId: string): Promise<VideoSchemaDb[]> {
    return await db.selectFrom("schemas").selectAll().where("project_id", "=", projectId).execute();
  },

  async findAllSchemasByProjectIds(projectIds: string[]): Promise<VideoSchemaDb[]> {
    if (projectIds.length === 0) return [];
    return await db
      .selectFrom("schemas")
      .selectAll()
      .where("project_id", "in", projectIds)
      .execute();
  },

  /**
   * Segments
   */
  async createSegment(segment: NewSegment): Promise<DbSegment> {
    return await db.insertInto("segments").values(segment).returningAll().executeTakeFirstOrThrow();
  },

  async bulkCreateSegments(segments: NewSegment[]): Promise<DbSegment[]> {
    if (segments.length === 0) return [];
    return await db.insertInto("segments").values(segments).returningAll().execute();
  },

  async bulkUpdateSegments(updates: (SegmentUpdate & { id: string })[]): Promise<DbSegment[]> {
    const updatedSegments: DbSegment[] = [];

    for (const { id, ...fields } of updates) {
      if (Object.keys(fields).length === 0) continue;
      const updated = await db
        .updateTable("segments")
        .set(fields)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
      updatedSegments.push(updated);
    }

    return updatedSegments;
  },

  async findSegmentsBySchemaId(schemaId: string): Promise<DbSegment[]> {
    return await db
      .selectFrom("segments")
      .selectAll()
      .where("schema_id", "=", schemaId)
      .orderBy("order", "asc")
      .execute();
  },

  async findByProjectId(projectId: string): Promise<DbSegment[]> {
    return await db
      .selectFrom("segments")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("order", "asc")
      .execute();
  },

  async findByProjectIds(projectIds: string[]): Promise<DbSegment[]> {
    if (projectIds.length === 0) return [];
    return await db
      .selectFrom("segments")
      .selectAll()
      .where("project_id", "in", projectIds)
      .orderBy("order", "asc")
      .execute();
  },

  async deleteByProjectId(projectId: string): Promise<void> {
    await db.deleteFrom("segments").where("project_id", "=", projectId).execute();
  },

  async deleteBySchemaId(schemaId: string): Promise<void> {
    await db.deleteFrom("segments").where("schema_id", "=", schemaId).execute();
  },

  async bulkDeleteSegments(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.deleteFrom("segments").where("id", "in", ids).execute();
  },

  async findSegmentById(id: string): Promise<DbSegment | undefined> {
    return await db.selectFrom("segments").selectAll().where("id", "=", id).executeTakeFirst();
  },
};
