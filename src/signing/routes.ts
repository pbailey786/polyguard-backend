import { Hono } from "hono";
import { z } from "zod";
import { verifySession } from "../auth/siwe";
import { signBuilderRequest, createBuilderOrderPayload } from "./builder";
import type { BuilderSigningRequest, ApiResponse } from "../types";

const router = new Hono();

// Request validation schemas
const BuilderSigningSchema = z.object({
  orderId: z.string().min(1),
  marketId: z.string().min(1),
  amount: z.number().positive(),
  price: z.number().positive(),
});

/**
 * POST /signing/builder-sign
 * Sign an order request with builder code attribution
 * Headers: Authorization: Bearer <token>
 * Body: { orderId, marketId, amount, price }
 */
router.post("/builder-sign", async (c) => {
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
    const validation = BuilderSigningSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid request parameters",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const request = validation.data as BuilderSigningRequest;

    // Create signed payload
    const signedPayload = createBuilderOrderPayload(request);

    return c.json<
      ApiResponse<{
        orderId: string;
        signature: string;
        timestamp: number;
        builderCode: string;
      }>
    >(
      {
        success: true,
        data: {
          orderId: signedPayload.orderId,
          signature: signedPayload.builder.signature,
          timestamp: signedPayload.builder.timestamp,
          builderCode: signedPayload.builder.code,
        },
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    console.error("Builder signing error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Signing failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /signing/batch-sign
 * Sign multiple orders in a batch (for efficiency)
 * Headers: Authorization: Bearer <token>
 * Body: { orders: [...] }
 */
router.post("/batch-sign", async (c) => {
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

    // Parse request
    const body = await c.req.json<{ orders: unknown[] }>();
    const { orders } = body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return c.json(
        {
          success: false,
          error: "orders must be a non-empty array",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Sign each order
    const signedOrders = [];
    const errors = [];

    for (let i = 0; i < orders.length; i++) {
      try {
        const validation = BuilderSigningSchema.safeParse(orders[i]);
        if (!validation.success) {
          errors.push({
            index: i,
            error: "Invalid order parameters",
          });
          continue;
        }

        const request = validation.data as BuilderSigningRequest;
        const signedPayload = createBuilderOrderPayload(request);

        signedOrders.push({
          orderId: signedPayload.orderId,
          signature: signedPayload.builder.signature,
          timestamp: signedPayload.builder.timestamp,
          builderCode: signedPayload.builder.code,
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Signing failed",
        });
      }
    }

    return c.json<
      ApiResponse<{
        signed: number;
        failed: number;
        signedOrders: unknown[];
        errors: unknown[];
      }>
    >(
      {
        success: errors.length === 0,
        data: {
          signed: signedOrders.length,
          failed: errors.length,
          signedOrders,
          errors,
        },
        timestamp: new Date().toISOString(),
      },
      errors.length === 0 ? 200 : 207
    );
  } catch (error) {
    console.error("Batch signing error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Batch signing failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default router;
