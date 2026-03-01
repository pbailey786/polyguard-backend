/**
 * Supabase Database Client
 * Initializes connection to PostgreSQL via Supabase
 * Phase 3: Real database connection (requires POSTGRES_URL from Paul)
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: any;

/**
 * Initialize database connection
 * Expects POSTGRES_URL in environment variables
 * Format: postgresql://user:password@host:port/database
 */
export function initDatabase() {
  const postgresUrl = process.env.POSTGRES_URL;

  if (!postgresUrl) {
    console.warn(
      "⚠️ POSTGRES_URL not set - database disabled. Waiting for Supabase connection string from Paul."
    );
    return null;
  }

  try {
    console.log("🔗 Connecting to PostgreSQL via Supabase...");
    
    const client = postgres(postgresUrl, {
      prepare: false, // Disable prepared statements for compatibility
      idle_timeout: 30, // 30 second idle timeout
      max_lifetime: 600, // 10 minute connection lifetime
    });

    db = drizzle(client, { schema, logger: true });
    console.log("✅ Database connection established");
    return db;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return null;
  }
}

/**
 * Get database instance
 * Returns null if not initialized
 */
export function getDb() {
  if (!db) {
    console.warn("⚠️ Database not initialized. Call initDatabase() first.");
    return null;
  }
  return db;
}

/**
 * Check database health
 * Simple query to verify connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;

    // Simple health check query
    await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

export default schema;
