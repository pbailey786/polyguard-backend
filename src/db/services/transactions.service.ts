/**
 * Transactions Service
 * Database operations for transaction logging, fees, and audit trails
 */

import { getDb } from "../client";
import { transactions } from "../schema";
import { eq } from "drizzle-orm";

export interface CreateTransactionInput {
  orderId: string;
  userId: string;
  txHash?: string;
  builderCode?: string;
  builderFee?: string;
  totalFee?: string;
  profitLoss?: string;
  notes?: string;
}

/**
 * Create a transaction log entry
 */
export async function createTransaction(input: CreateTransactionInput) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .insert(transactions)
      .values({
        orderId: input.orderId,
        userId: input.userId,
        txHash: input.txHash,
        builderCode: input.builderCode,
        builderFee: input.builderFee,
        totalFee: input.totalFee,
        profitLoss: input.profitLoss,
        notes: input.notes,
      })
      .returning();

    console.log(`✅ Transaction logged: ${result[0].id}`);
    return result[0];
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(transactionId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting transaction:", error);
    throw error;
  }
}

/**
 * Get transactions by order ID
 */
export async function getOrderTransactions(orderId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.orderId, orderId));
  } catch (error) {
    console.error("Error getting order transactions:", error);
    throw error;
  }
}

/**
 * Get all transactions for a user
 */
export async function getUserTransactions(userId: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));
  } catch (error) {
    console.error("Error getting user transactions:", error);
    throw error;
  }
}

/**
 * Get transaction by tx hash
 */
export async function getTransactionByHash(txHash: string) {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.txHash, txHash));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting transaction by hash:", error);
    throw error;
  }
}

/**
 * Get user's total fees collected
 */
export async function getUserTotalFees(userId: string): Promise<string> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const userTransactions = await getUserTransactions(userId);

    let totalFees = 0;
    for (const tx of userTransactions) {
      if (tx.totalFee) {
        totalFees += parseFloat(tx.totalFee);
      }
    }

    return totalFees.toString();
  } catch (error) {
    console.error("Error getting user total fees:", error);
    throw error;
  }
}

/**
 * Get user's total builder fees (fees earned through builder attribution)
 */
export async function getUserBuilderFees(userId: string): Promise<string> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const userTransactions = await getUserTransactions(userId);

    let totalBuilderFees = 0;
    for (const tx of userTransactions) {
      if (tx.builderFee) {
        totalBuilderFees += parseFloat(tx.builderFee);
      }
    }

    return totalBuilderFees.toString();
  } catch (error) {
    console.error("Error getting user builder fees:", error);
    throw error;
  }
}

/**
 * Get user's total P&L
 */
export async function getUserTotalPandL(userId: string): Promise<string> {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const userTransactions = await getUserTransactions(userId);

    let totalPandL = 0;
    for (const tx of userTransactions) {
      if (tx.profitLoss) {
        totalPandL += parseFloat(tx.profitLoss);
      }
    }

    return totalPandL.toString();
  } catch (error) {
    console.error("Error getting user total P&L:", error);
    throw error;
  }
}

/**
 * Get all transactions (admin/reporting)
 */
export async function getAllTransactions() {
  try {
    const db = getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    return await db.select().from(transactions);
  } catch (error) {
    console.error("Error getting all transactions:", error);
    throw error;
  }
}

/**
 * Export user's transaction history as JSON
 */
export async function exportUserTransactionHistory(userId: string) {
  try {
    const userTxs = await getUserTransactions(userId);
    const totalFees = await getUserTotalFees(userId);
    const builderFees = await getUserBuilderFees(userId);
    const pandL = await getUserTotalPandL(userId);

    return {
      userId,
      transactions: userTxs,
      summary: {
        totalFees,
        builderFees,
        profitLoss: pandL,
        transactionCount: userTxs.length,
      },
    };
  } catch (error) {
    console.error("Error exporting transaction history:", error);
    throw error;
  }
}
