import { db } from "./index";
import type {
  ChatSession,
  NewChatSession,
  ChatMessage,
  NewChatMessage,
  DbSegment,
  NewSegment,
} from "./types";

export const chatQueries = {
  async getOrCreateSession(
    userId: string,
    projectId: string,
    videoId: string | null,
  ): Promise<ChatSession> {
    // Identify session by userId and projectId ONLY
    const existing = await db
      .selectFrom("chat_sessions")
      .selectAll()
      .where("user_id", "=", userId)
      .where("project_id", "=", projectId)
      .executeTakeFirst();

    if (existing) {
      // If we have a new videoId, update the session context
      if (videoId && existing.video_id !== videoId) {
        return await db
          .updateTable("chat_sessions")
          .set({ video_id: videoId })
          .where("id", "=", existing.id)
          .returningAll()
          .executeTakeFirstOrThrow();
      }
      return existing;
    }

    // Create new project-level session
    return await db
      .insertInto("chat_sessions")
      .values({
        id: crypto.randomUUID(),
        user_id: userId,
        project_id: projectId,
        video_id: videoId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async addMessage(message: NewChatMessage): Promise<ChatMessage> {
    return await db
      .insertInto("chat_messages")
      .values(message)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db
      .selectFrom("chat_messages")
      .selectAll()
      .where("session_id", "=", sessionId)
      .orderBy("created_at", "asc")
      .execute();
  },

  async saveSegment(segment: NewSegment): Promise<DbSegment> {
    return await db.insertInto("segments").values(segment).returningAll().executeTakeFirstOrThrow();
  },

  async getSegments(projectId: string): Promise<DbSegment[]> {
    return await db
      .selectFrom("segments")
      .selectAll()
      .where("project_id", "=", projectId)
      .orderBy("created_at", "asc")
      .execute();
  },

  async deleteSegments(projectId: string): Promise<void> {
    await db.deleteFrom("segments").where("project_id", "=", projectId).execute();
  },
};
