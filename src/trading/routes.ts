import { Hono } from "hono";
import { z } from "zod";
import { verifySession } from "../auth/siwe";
import { getClobClient } from "./clob-client";
import { createBuilderOrderPayload } from "../signing/builder";
import type { OrderExecutionRequest, ApiResponse } from "../types";

const router = new Hono();

// Validation schemas
const PlaceOrderSchema = z.object({
  marketId: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive(),
  price: z.number().positive().optional(),
});

const StopLossOrderSchema = z.object({
  marketId: z.string().min(1),
  amount: z.number().positive(),
  price: z.number().positive(),
});

/**
 * POST /trading/execute
 * Execute an order with builder code attribution
 * Headers: Authorization: Bearer <token>
 * Body: { marketId, side, amount, price? }
 */
router.post("/execute", async (c) => {
  try {
    // Verify session
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
    const validation = PlaceOrderSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid order parameters",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const orderRequest = validation.data;
    const clobClient = getClobClient();

    // Create execution request with builder code
    const executionRequest: OrderExecutionRequest = {
      marketId: orderRequest.marketId,
      side: orderRequest.side,
      amount: orderRequest.amount,
      price: orderRequest.price,
      builderCode: session.address, // Use user address as builder identifier
    };

    // Execute order
    const result = await clobClient.placeOrder(executionRequest);

    if (!result.success) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    return c.json<
      ApiResponse<{
        orderId: string;
        marketId: string;
        side: string;
        amount: number;
        price?: number;
        paperTrade?: boolean;
      }>
    >(
      {
        success: true,
        data: {
          orderId: result.orderId || "",
          marketId: orderRequest.marketId,
          side: orderRequest.side,
          amount: orderRequest.amount,
          price: orderRequest.price,
          paperTrade: result.paperTrade,
        },
        timestamp: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("Order execution error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Execution failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /trading/stop-loss
 * Execute a stop-loss sell order
 * Headers: Authorization: Bearer <token>
 * Body: { marketId, amount, price }
 */
router.post("/stop-loss", async (c) => {
  try {
    // Verify session
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
    const validation = StopLossOrderSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid stop-loss parameters",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const { marketId, amount, price } = validation.data;
    const clobClient = getClobClient();

    // Generate order ID for builder signing
    const orderId = `sl_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Sign with builder code
    const signedPayload = createBuilderOrderPayload({
      orderId,
      marketId,
      amount,
      price,
    });

    // Execute stop-loss order (FOK sell)
    const result = await clobClient.placeStopLossOrder(
      marketId,
      amount,
      price,
      signedPayload.builder.code
    );

    if (!result.success) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    return c.json<
      ApiResponse<{
        orderId: string;
        marketId: string;
        amount: number;
        price: number;
        type: string;
        paperTrade?: boolean;
      }>
    >(
      {
        success: true,
        data: {
          orderId: result.orderId || "",
          marketId,
          amount,
          price,
          type: "stop-loss-sell",
          paperTrade: result.paperTrade,
        },
        timestamp: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("Stop-loss execution error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Stop-loss execution failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * GET /trading/orders
 * Get all open orders
 */
router.get("/orders", (c) => {
  try {
    const clobClient = getClobClient();
    const orders = clobClient.getOpenOrders();

    return c.json<ApiResponse<{ orders: unknown[] }>>({
      success: true,
      data: {
        orders,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
 * Get order status
 */
router.get("/orders/:orderId", (c) => {
  try {
    const { orderId } = c.req.param();
    const clobClient = getClobClient();
    const order = clobClient.getOrderStatus(orderId);

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

    return c.json<ApiResponse<{ order: unknown }>>({
      success: true,
      data: { order },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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
 * POST /trading/orders/:orderId/cancel
 * Cancel an order
 */
router.post("/orders/:orderId/cancel", async (c) => {
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
    const clobClient = getClobClient();
    const result = await clobClient.cancelOrder(orderId);

    if (!result.success) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    return c.json<ApiResponse>({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cancellation failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default router;
