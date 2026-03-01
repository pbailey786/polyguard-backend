import crypto from "crypto";
import { config } from "../config";
import type { BuilderSigningRequest, BuilderSigningResponse } from "../types";

/**
 * Create an HMAC signature for builder code attribution
 * This signature proves to Polymarket that orders came through our builder code
 */
export function signBuilderRequest(
  orderId: string,
  marketId: string,
  amount: number,
  price: number
): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);

  // Create signature payload
  const payload = [
    config.builderCode,
    orderId,
    marketId,
    amount.toString(),
    price.toString(),
    timestamp.toString(),
  ].join("|");

  // Sign with builder secret key using HMAC-SHA256
  const signature = crypto
    .createHmac("sha256", config.builderSecretKey)
    .update(payload)
    .digest("hex");

  return { signature, timestamp };
}

/**
 * Verify a builder signature (for internal validation)
 */
export function verifyBuilderSignature(
  signature: string,
  orderId: string,
  marketId: string,
  amount: number,
  price: number,
  timestamp: number
): boolean {
  const payload = [
    config.builderCode,
    orderId,
    marketId,
    amount.toString(),
    price.toString(),
    timestamp.toString(),
  ].join("|");

  const expectedSignature = crypto
    .createHmac("sha256", config.builderSecretKey)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}

/**
 * Format a signature request for Polymarket CLOB API
 * This includes all necessary headers for builder attribution
 */
export function formatBuilderHeaders(
  signature: string,
  timestamp: number
): Record<string, string> {
  return {
    "X-Builder-Code": config.builderCode,
    "X-Builder-Signature": signature,
    "X-Timestamp": timestamp.toString(),
  };
}

/**
 * Create a complete builder-attributed order payload
 */
export function createBuilderOrderPayload(
  request: BuilderSigningRequest
): {
  orderId: string;
  marketId: string;
  amount: number;
  price: number;
  builder: {
    code: string;
    signature: string;
    timestamp: number;
  };
} {
  const { signature, timestamp } = signBuilderRequest(
    request.orderId,
    request.marketId,
    request.amount,
    request.price
  );

  return {
    orderId: request.orderId,
    marketId: request.marketId,
    amount: request.amount,
    price: request.price,
    builder: {
      code: config.builderCode,
      signature,
      timestamp,
    },
  };
}
