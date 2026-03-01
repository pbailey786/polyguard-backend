/**
 * Orders Service
 * Database operations for trade orders
 */

import { getDb } from "../client";
import { orders } from "../schema";
import { eq, and, or } from "drizzle-orm";

export interface CreateOrderInput {
  userId: string;
  tokenId: string;
  marketId: string;
  side: "buy" | "sell";
  amount: string;
  price?: string;
  clobOrderId?: string;
  paperTrade?: boolean;
}

export interface UpdateOrderInput {
  status?: "pending" | "open" | "filled" | "partial_fill" | "cancelled" | "failed";
  pAndL?: string;
  executedAt?: Date;
  clobOrderId?: string;
  notes?: string;
}

/**
 * Create a new order
 */
export async function createOrder(input: CreateOrderInput) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .insert(orders)
      .values({
        userId: input.userId,
        tokenId: input.tokenId,
        marketId: input.marketId,
        side: input.side,
        amount: input.amount,
        price: input.price,
        clobOrderId: input.clobOrderId,
        paperTrade: input.paperTrade ?? false,
        status: "pending",
      })
      .returning();

    console.log(`✅ Order created: ${result[0].id}`);
    return result[0];
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db.select().from(orders).where(eq(orders.id, orderId));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting order:", error);
    throw error;
  }
}

/**
 * Get order by CLOB order ID
 */
export async function getOrderByClobId(clobOrderId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.clobOrderId, clobOrderId));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting order by CLOB ID:", error);
    throw error;
  }
}

/**
 * Get all orders for a user
 */
export async function getUserOrders(userId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db.select().from(orders).where(eq(orders.userId, userId));
  } catch (error) {
    console.error("Error getting user orders:", error);
    throw error;
  }
}

/**
 * Get open orders for a user
 */
export async function getUserOpenOrders(userId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          or(
            eq(orders.status, "open"),
            eq(orders.status, "pending"),
            eq(orders.status, "partial_fill")
          )
        )
      );
  } catch (error) {
    console.error("Error getting open orders:", error);
    throw error;
  }
}

/**
 * Get orders for a market
 */
export async function getMarketOrders(marketId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db.select().from(orders).where(eq(orders.marketId, marketId));
  } catch (error) {
    console.error("Error getting market orders:", error);
    throw error;
  }
}

/**
 * Update order
 */
export async function updateOrder(orderId: string, updates: UpdateOrderInput) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.pAndL !== undefined) updateData.pAndL = updates.pAndL;
    if (updates.executedAt !== undefined) updateData.executedAt = updates.executedAt;
    if (updates.clobOrderId !== undefined) updateData.clobOrderId = updates.clobOrderId;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const result = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, orderId))
      .returning();

    console.log(`✅ Order cancelled: ${orderId}`);
    return result[0] || null;
  } catch (error) {
    console.error("Error cancelling order:", error);
    throw error;
  }
}

/**
 * Get user's P&L (profit/loss across all orders)
 */
export async function getUserPandL(userId: string): Promise<string | null> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Sum P&L from all filled orders for the user
    const result = await db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.status, "filled")));

    let totalPandL = 0;
    for (const order of result) {
      if (order.pAndL) {
        totalPandL += parseFloat(order.pAndL);
      }
    }

    return totalPandL.toString();
  } catch (error) {
    console.error("Error getting user P&L:", error);
    throw error;
  }
}
