import { db } from "./index";
import type { User, NewUser, UserUpdate, Session, NewSession } from "./types";

/**
 * User-related database operations
 */
export const userQueries = {
  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    return await db.selectFrom("user").selectAll().where("email", "=", email).executeTakeFirst();
  },

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | undefined> {
    return await db.selectFrom("user").selectAll().where("id", "=", id).executeTakeFirst();
  },

  /**
   * Create a new user
   */
  async create(userData: NewUser): Promise<User> {
    return await db
      .insertInto("user")
      .values({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        email_verified: userData.email_verified,
        image: userData.image,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Update a user
   */
  async update(id: string, userData: UserUpdate): Promise<User | undefined> {
    return await db
      .updateTable("user")
      .set({
        name: userData.name,
        email: userData.email,
        email_verified: userData.email_verified,
        image: userData.image,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  },

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    await db.deleteFrom("user").where("id", "=", id).execute();
  },
};

/**
 * Session-related database operations
 */
export const sessionQueries = {
  /**
   * Find a session by token
   */
  async findByToken(token: string): Promise<Session | undefined> {
    return await db.selectFrom("session").selectAll().where("token", "=", token).executeTakeFirst();
  },

  /**
   * Find sessions by user ID
   */
  async findByUserId(userId: string): Promise<Session[]> {
    return await db.selectFrom("session").selectAll().where("user_id", "=", userId).execute();
  },

  /**
   * Create a new session
   */
  async create(sessionData: NewSession): Promise<Session> {
    return await db
      .insertInto("session")
      .values({
        id: sessionData.id,
        user_id: sessionData.user_id,
        expires_at: sessionData.expires_at,
        token: sessionData.token,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        ip_address: sessionData.ip_address,
        user_agent: sessionData.user_agent,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Delete a session by token
   */
  async deleteByToken(token: string): Promise<void> {
    await db.deleteFrom("session").where("token", "=", token).execute();
  },

  /**
   * Delete all sessions for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    await db.deleteFrom("session").where("user_id", "=", userId).execute();
  },

  /**
   * Remove expired sessions
   */
  async removeExpired(): Promise<void> {
    await db.deleteFrom("session").where("expires_at", "<", new Date()).execute();
  },
};

/**
 * Database health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.selectFrom("user").select(db.fn.count("id").as("count")).executeTakeFirst();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
