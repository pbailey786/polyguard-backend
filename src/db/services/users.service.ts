/**
 * Users Service
 * Database operations for user accounts and authentication
 */

import { getDb } from "../client";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export interface CreateUserInput {
  walletAddress: string;
  nonce?: string;
  authToken?: string;
}

export interface UpdateUserInput {
  authToken?: string;
  nonce?: string;
}

/**
 * Create or get a user by wallet address
 */
export async function createOrGetUser(input: CreateUserInput) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Check if user exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, input.walletAddress));

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new user
    const result = await db
      .insert(users)
      .values({
        walletAddress: input.walletAddress,
        nonce: input.nonce,
        authToken: input.authToken,
      })
      .returning();

    console.log(`✅ User created: ${input.walletAddress}`);
    return result[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
}

/**
 * Get user by auth token
 */
export async function getUserByToken(authToken: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.authToken, authToken));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting user by token:", error);
    throw error;
  }
}

/**
 * Update user
 */
export async function updateUser(walletAddress: string, updates: UpdateUserInput) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .update(users)
      .set({
        authToken: updates.authToken,
        nonce: updates.nonce,
        updatedAt: new Date(),
      })
      .where(eq(users.walletAddress, walletAddress))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete user and all related data
 */
export async function deleteUser(walletAddress: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    await db.delete(users).where(eq(users.walletAddress, walletAddress));
    console.log(`✅ User deleted: ${walletAddress}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db.select().from(users);
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}
