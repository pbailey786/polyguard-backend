import { Hono } from "hono";
import type { SIWERequest, SIWEResponse, ApiResponse } from "../types";
import {
  generateNonce,
  createSiweMessage,
  verifySiweMessage,
  createSession,
  verifySession,
  invalidateSession,
} from "./siwe";

const router = new Hono();

/**
 * GET /auth/nonce
 * Generate a nonce for SIWE challenge
 */
router.get("/nonce", (c) => {
  const nonce = generateNonce();
  return c.json<ApiResponse<{ nonce: string; message: string }>>({
    success: true,
    data: {
      nonce,
      message: "Use this nonce to sign in with Ethereum",
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /auth/message
 * Create a SIWE message for signing
 * Body: { address: string, nonce: string }
 */
router.post("/message", async (c) => {
  try {
    const { address, nonce } = await c.req.json<{
      address: string;
      nonce: string;
    }>();

    if (!address || !nonce) {
      return c.json(
        {
          success: false,
          error: "address and nonce are required",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const message = createSiweMessage(address, nonce);

    return c.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create message",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /auth/verify
 * Verify a signed SIWE message and create a session
 * Body: { message: string, signature: string }
 */
router.post("/verify", async (c) => {
  try {
    const body = await c.req.json<SIWERequest>();
    const { message, signature } = body;

    if (!message || !signature) {
      return c.json(
        {
          success: false,
          error: "message and signature are required",
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Extract nonce from message for session creation
    const nonceMatch = message.match(/nonce=(\w+)/);
    const nonce = nonceMatch ? nonceMatch[1] : "";

    // Verify the signature
    const verification = await verifySiweMessage(message, signature);

    if (!verification.valid || !verification.address) {
      return c.json<SIWEResponse>(
        {
          success: false,
          error: verification.error || "Verification failed",
        },
        401
      );
    }

    // Create session
    const token = createSession(verification.address, nonce);

    return c.json<SIWEResponse>(
      {
        success: true,
        address: verification.address,
        token,
      },
      200
    );
  } catch (error) {
    return c.json<SIWEResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      },
      500
    );
  }
});

/**
 * GET /auth/verify-session
 * Verify the current session token
 * Headers: Authorization: Bearer <token>
 */
router.get("/verify-session", (c) => {
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

    return c.json<ApiResponse<{ address: string; expiresAt: string }>>({
      success: true,
      data: {
        address: session.address,
        expiresAt: session.expiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /auth/logout
 * Invalidate the current session
 * Headers: Authorization: Bearer <token>
 */
router.post("/logout", (c) => {
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
    invalidateSession(token);

    return c.json<ApiResponse>({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Logout failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default router;
