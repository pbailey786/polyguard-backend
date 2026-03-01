/**
 * Stop Loss Service
 * Database operations for stop-loss orders
 */

import { getDb } from "../client";
import { stopLosses } from "../schema";
import { eq, and } from "drizzle-orm";

export interface CreateStopLossInput {
  userId: string;
  tokenId: string;
  marketId: string;
  triggerPrice: string;
  quantity: string;
}

export interface UpdateStopLossInput {
  status?: "active" | "triggered" | "cancelled" | "executed";
  triggeredAt?: Date;
}

/**
 * Create a new stop-loss order
 */
export async function createStopLoss(input: CreateStopLossInput) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .insert(stopLosses)
      .values({
        userId: input.userId,
        tokenId: input.tokenId,
        marketId: input.marketId,
        triggerPrice: input.triggerPrice,
        quantity: input.quantity,
        status: "active",
      })
      .returning();

    console.log(
      `✅ Stop-loss created: ${result[0].id} at price ${input.triggerPrice}`
    );
    return result[0];
  } catch (error) {
    console.error("Error creating stop-loss:", error);
    throw error;
  }
}

/**
 * Get stop-loss by ID
 */
export async function getStopLossById(stopLossId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .select()
      .from(stopLosses)
      .where(eq(stopLosses.id, stopLossId));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting stop-loss:", error);
    throw error;
  }
}

/**
 * Get all active stop-losses for a user
 */
export async function getUserActiveStopLosses(userId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(stopLosses)
      .where(and(eq(stopLosses.userId, userId), eq(stopLosses.status, "active")));
  } catch (error) {
    console.error("Error getting active stop-losses:", error);
    throw error;
  }
}

/**
 * Get all stop-losses for a user
 */
export async function getUserStopLosses(userId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(stopLosses)
      .where(eq(stopLosses.userId, userId));
  } catch (error) {
    console.error("Error getting user stop-losses:", error);
    throw error;
  }
}

/**
 * Get all active stop-losses for monitoring
 * Called by WebSocket monitor to check triggers
 */
export async function getAllActiveStopLosses() {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(stopLosses)
      .where(eq(stopLosses.status, "active"));
  } catch (error) {
    console.error("Error getting all active stop-losses:", error);
    throw error;
  }
}

/**
 * Get stop-losses for a specific market
 */
export async function getMarketStopLosses(marketId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(stopLosses)
      .where(and(eq(stopLosses.marketId, marketId), eq(stopLosses.status, "active")));
  } catch (error) {
    console.error("Error getting market stop-losses:", error);
    throw error;
  }
}

/**
 * Update stop-loss status
 */
export async function updateStopLoss(
  stopLossId: string,
  updates: UpdateStopLossInput
) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .update(stopLosses)
      .set({
        status: updates.status,
        triggeredAt: updates.triggeredAt,
      })
      .where(eq(stopLosses.id, stopLossId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error updating stop-loss:", error);
    throw error;
  }
}

/**
 * Mark stop-loss as triggered
 */
export async function triggerStopLoss(stopLossId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .update(stopLosses)
      .set({
        status: "triggered",
        triggeredAt: new Date(),
      })
      .where(eq(stopLosses.id, stopLossId))
      .returning();

    console.log(`🛑 Stop-loss triggered: ${stopLossId}`);
    return result[0] || null;
  } catch (error) {
    console.error("Error triggering stop-loss:", error);
    throw error;
  }
}

/**
 * Cancel stop-loss
 */
export async function cancelStopLoss(stopLossId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .update(stopLosses)
      .set({ status: "cancelled" })
      .where(eq(stopLosses.id, stopLossId))
      .returning();

    console.log(`✅ Stop-loss cancelled: ${stopLossId}`);
    return result[0] || null;
  } catch (error) {
    console.error("Error cancelling stop-loss:", error);
    throw error;
  }
}
