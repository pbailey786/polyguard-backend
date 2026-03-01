import { SiweMessage } from "siwe";
import { verifyMessage } from "ethers";
import { config } from "../config";
import type { AuthSession } from "../types";

// In-memory session store (upgrade to Redis in production)
const sessions = new Map<string, AuthSession>();

/**
 * Generate a nonce for SIWE challenge
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/**
 * Create a SIWE message for the user to sign
 */
export function createSiweMessage(
  address: string,
  nonce: string
): string {
  const message = new SiweMessage({
    domain: config.siweDomain,
    address: address,
    statement: "Sign in with Ethereum to PolyGuard",
    uri: config.siweUri,
    version: "1",
    chainId: 1, // Ethereum mainnet
    nonce: nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
  });

  return message.prepareMessage();
}

/**
 * Verify a signed SIWE message
 */
export async function verifySiweMessage(
  message: string,
  signature: string
): Promise<{ valid: boolean; address?: string; error?: string }> {
  try {
    // Parse the message
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const recoveredAddress = verifyMessage(message, signature);

    // Check if address matches
    if (recoveredAddress.toLowerCase() !== siweMessage.address.toLowerCase()) {
      return {
        valid: false,
        error: "Signature address mismatch",
      };
    }

    // Check expiration
    if (siweMessage.expirationTime) {
      if (new Date(siweMessage.expirationTime) < new Date()) {
        return {
          valid: false,
          error: "Message expired",
        };
      }
    }

    // Check domain and uri
    if (siweMessage.domain !== config.siweDomain) {
      return {
        valid: false,
        error: "Domain mismatch",
      };
    }

    return {
      valid: true,
      address: recoveredAddress.toLowerCase(),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Create a session after successful SIWE verification
 */
export function createSession(address: string, nonce: string): string {
  const sessionId = Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  sessions.set(sessionId, {
    address: address.toLowerCase(),
    nonce,
    expiresAt,
  });

  return sessionId;
}

/**
 * Verify a session token
 */
export function verifySession(sessionId: string): AuthSession | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Invalidate a session
 */
export function invalidateSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get all active sessions (for debugging)
 */
export function getAllSessions(): Map<string, AuthSession> {
  return new Map(sessions);
}
