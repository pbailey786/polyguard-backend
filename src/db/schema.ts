/**
 * Drizzle ORM Schema Definition
 * Defines all PostgreSQL tables for Phase 3
 */

import { 
  pgTable, 
  pgEnum, 
  uuid, 
  varchar, 
  numeric, 
  timestamp, 
  boolean,
  text,
  uniqueIndex,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums for status fields
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "open",
  "filled",
  "partial_fill",
  "cancelled",
  "failed",
]);

export const stopLossStatusEnum = pgEnum("stop_loss_status", [
  "active",
  "triggered",
  "cancelled",
  "executed",
]);

export const orderSideEnum = pgEnum("order_side", ["buy", "sell"]);

/**
 * Users Table
 * Stores wallet addresses and authentication tokens
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
    authToken: varchar("auth_token", { length: 255 }),
    nonce: varchar("nonce", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    walletIdx: uniqueIndex("wallet_idx").on(table.walletAddress),
    authTokenIdx: index("auth_token_idx").on(table.authToken),
  })
);

/**
 * Stop Losses Table
 * Stores stop-loss orders with trigger prices and status
 */
export const stopLosses = pgTable(
  "stop_losses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenId: varchar("token_id", { length: 255 }).notNull(),
    marketId: varchar("market_id", { length: 255 }).notNull(),
    triggerPrice: numeric("trigger_price", { precision: 18, scale: 8 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
    status: stopLossStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    triggeredAt: timestamp("triggered_at"),
  },
  (table) => ({
    userIdx: index("stop_loss_user_idx").on(table.userId),
    statusIdx: index("stop_loss_status_idx").on(table.status),
    marketIdx: index("stop_loss_market_idx").on(table.marketId),
  })
);

/**
 * Orders Table
 * Stores all order executions (buy/sell, FOK, etc.)
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenId: varchar("token_id", { length: 255 }).notNull(),
    marketId: varchar("market_id", { length: 255 }).notNull(),
    side: orderSideEnum("side").notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    price: numeric("price", { precision: 18, scale: 8 }),
    status: orderStatusEnum("status").default("pending").notNull(),
    pAndL: numeric("p_and_l", { precision: 18, scale: 8 }),
    clobOrderId: varchar("clob_order_id", { length: 255 }),
    paperTrade: boolean("paper_trade").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    executedAt: timestamp("executed_at"),
  },
  (table) => ({
    userIdx: index("order_user_idx").on(table.userId),
    statusIdx: index("order_status_idx").on(table.status),
    marketIdx: index("order_market_idx").on(table.marketId),
    clobOrderIdx: uniqueIndex("clob_order_idx").on(table.clobOrderId),
  })
);

/**
 * Transactions Table
 * Logs all transaction details for audit, fees, builder attribution
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    txHash: varchar("tx_hash", { length: 255 }),
    builderCode: varchar("builder_code", { length: 255 }),
    builderFee: numeric("builder_fee", { precision: 18, scale: 8 }),
    totalFee: numeric("total_fee", { precision: 18, scale: 8 }),
    profitLoss: numeric("profit_loss", { precision: 18, scale: 8 }),
    notes: text("notes"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index("transaction_order_idx").on(table.orderId),
    userIdx: index("transaction_user_idx").on(table.userId),
    txHashIdx: uniqueIndex("tx_hash_idx").on(table.txHash),
  })
);

/**
 * Price History Table (Optional - for monitoring)
 * Stores historical price data from WebSocket for analysis
 */
export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketId: varchar("market_id", { length: 255 }).notNull(),
    bid: numeric("bid", { precision: 18, scale: 8 }),
    ask: numeric("ask", { precision: 18, scale: 8 }),
    lastPrice: numeric("last_price", { precision: 18, scale: 8 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    marketIdx: index("price_market_idx").on(table.marketId),
    timestampIdx: index("price_timestamp_idx").on(table.timestamp),
  })
);

/**
 * Relations (for Drizzle ORM query convenience)
 */
export const usersRelations = relations(users, ({ many }) => ({
  stopLosses: many(stopLosses),
  orders: many(orders),
  transactions: many(transactions),
}));

export const stopLossesRelations = relations(stopLosses, ({ one }) => ({
  user: one(users, {
    fields: [stopLosses.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));
