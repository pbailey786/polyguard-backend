/**
 * Phase 4 Trading Routes
 * Real order execution endpoints with safety guards
 */

import { Hono } from "hono";
import { z } from "zod";
import { verifySession } from "../auth/siwe";
import { getPhase4Executor } from "./phase4-executor";
import { getOrderById, getUserOrders } from "../db/services/orders.service";
import type { OrderExecutionRequest, ApiResponse } from "../types";

const router = new Hono();

// Validation schemas
const ExecuteOrderSchema = z.object({
  marketId: z.string().min(1, "Market ID required"),
  side: z.enum(["buy", "sell"], {
    errorMap: () => ({ message: "Side must be buy or sell" }),
  }),
  amount: z.number().positive("Amount must be positive"),
  price: z.number().positive().optional(),
});

const CancelOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID required"),
});

/**
 * POST /trading/execute/real
 * Execute real order with Phase 4 safety guards
 * 
 * Request:
 * {
 *   "marketId": "0x1234...",
 *   "side": "sell",
 *   "amount": 100,
 *   "price": 0.50
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "orderId": "...",
 *   "clobOrderId": "...",
 *   "transactionHash": "...",
 *   "paperTrade": false
 * }
 */
router.post("/execute/real", async (c) => {
  try {
    // Verify authentication
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          error: "Missing or invalid authorization token",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const session = verifySession(token);

    if (!session) {
      return c.json(
        {
          success: false,
          error: "Invalid or expired session",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    // Parse and validate request body
    const body = await c.req.json();
    const validation = ExecuteOrderSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      return c.json(
        {
          success: false,
          error: `Validation failed: ${errors}`,
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const orderRequest = validation.data;
    const executor = getPhase4Executor();

    // Execute order (builderCode is internal to executor)
    const result = await executor.executeOrder({
      userId: session.address || "user",
      marketId: orderRequest.marketId,
      side: orderRequest.side,
      amount: orderRequest.amount,
      price: orderRequest.price,
    } as any);

    // Return result
    if (result.success) {
      return c.json<
        ApiResponse<{
          orderId: string;
          clobOrderId?: string;
          transactionHash?: string;
          paperTrade?: boolean;
          message?: string;
        }>
      >(
        {
          success: true,
          data: {
            orderId: result.orderId || "",
            clobOrderId: result.clobOrderId,
            transactionHash: result.transactionHash,
            paperTrade: result.paperTrade,
            message: result.message,
          },
          timestamp: new Date().toISOString(),
        },
        201
      );
    } else {
      return c.json<ApiResponse>(
        {
          success: false,
          error: result.error || "Order execution failed",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }
  } catch (error) {
    console.error("Order execution error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /trading/cancel
 * Cancel an open order
 */
router.post("/cancel", async (c) => {
  try {
    // Verify authentication
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          error: "Missing authorization token",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const session = verifySession(token);

    if (!session) {
      return c.json(
        {
          success: false,
          error: "Invalid or expired session",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    // Parse and validate request
    const body = await c.req.json();
    const validation = CancelOrderSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid order ID",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const { orderId } = validation.data;
    const executor = getPhase4Executor();

    // Cancel order
    const result = await executor.cancelOrder(orderId, session.address || "user");

    if (result.success) {
      return c.json<ApiResponse>(
        {
          success: true,
          data: { message: "Order cancelled" },
          timestamp: new Date().toISOString(),
        },
        200
      );
    } else {
      return c.json<ApiResponse>(
        {
          success: false,
          error: result.error || "Cancellation failed",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }
  } catch (error) {
    console.error("Cancellation error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * GET /trading/orders
 * Get user's open orders
 */
router.get("/orders", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          error: "Missing authorization token",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const session = verifySession(token);

    if (!session) {
      return c.json(
        {
          success: false,
          error: "Invalid or expired session",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const executor = getPhase4Executor();
    const orders = await executor.getUserOpenOrders(session.address || "user");

    return c.json<ApiResponse<{ orders: any[]; count: number }>>(
      {
        success: true,
        data: {
          orders,
          count: orders.length,
        },
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    console.error("Order fetch error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch orders",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * GET /trading/orders/:orderId
 * Get specific order details
 */
router.get("/orders/:orderId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          error: "Missing authorization token",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const session = verifySession(token);

    if (!session) {
      return c.json(
        {
          success: false,
          error: "Invalid or expired session",
          timestamp: new Date().toISOString(),
        },
        401
      );
    }

    const { orderId } = c.req.param();
    const order = await getOrderById(orderId);

    if (!order) {
      return c.json(
        {
          success: false,
          error: "Order not found",
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Verify ownership
    if (order.userId !== (session.address || "user")) {
      return c.json(
        {
          success: false,
          error: "Unauthorized",
          timestamp: new Date().toISOString(),
        },
        403
      );
    }

    return c.json<ApiResponse<{ order: any }>>(
      {
        success: true,
        data: { order },
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    console.error("Order fetch error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch order",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * GET /trading/stats
 * Get Phase 4 execution stats
 */
router.get("/stats", (c) => {
  try {
    const executor = getPhase4Executor();
    const stats = executor.getStats();

    return c.json<ApiResponse<any>>(
      {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch stats",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default router;
