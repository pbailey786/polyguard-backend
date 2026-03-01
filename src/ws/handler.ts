import { Hono } from "hono";
import { config } from "../config";
import type { PriceUpdate } from "../types";

/**
 * WebSocket handler for real-time price monitoring
 * Connects to Polymarket WebSocket and broadcasts price updates
 */

interface SubscribedClient {
  markets: Set<string>;
  send: (data: unknown) => Promise<void>;
}

// Store active WebSocket connections
const connectedClients: Map<string, SubscribedClient> = new Map();
let wsConnection: WebSocket | null = null;

/**
 * Connect to Polymarket WebSocket
 */
async function connectToPolymarketWs(): Promise<void> {
  if (wsConnection) {
    return; // Already connected
  }

  try {
    console.log(`🔌 Connecting to Polymarket WebSocket: ${config.polymarketWsUrl}`);

    wsConnection = new WebSocket(config.polymarketWsUrl);

    wsConnection.addEventListener("open", () => {
      console.log("✅ Polymarket WebSocket connected");
    });

    wsConnection.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handlePriceUpdate(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    });

    wsConnection.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      wsConnection = null;
    });

    wsConnection.addEventListener("close", () => {
      console.log("⚠️ Polymarket WebSocket disconnected");
      wsConnection = null;

      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        connectToPolymarketWs().catch(console.error);
      }, 5000);
    });
  } catch (error) {
    console.error("Failed to connect to Polymarket WebSocket:", error);
    wsConnection = null;
  }
}

/**
 * Handle incoming price updates from Polymarket
 */
function handlePriceUpdate(data: unknown): void {
  // TODO: Validate against actual Polymarket schema
  const update = data as PriceUpdate;

  console.log(
    `📈 Price update: ${update.marketId} @ ${update.price} (bid: ${update.bid}, ask: ${update.ask})`
  );

  // Broadcast to subscribed clients
  connectedClients.forEach((client) => {
    if (client.markets.has(update.marketId)) {
      client.send({ type: "price", data: update }).catch(console.error);
    }
  });
}

/**
 * Subscribe a client to market updates
 */
function subscribeClient(
  clientId: string,
  marketId: string,
  send: (data: unknown) => Promise<void>
): void {
  let client = connectedClients.get(clientId);

  if (!client) {
    client = {
      markets: new Set(),
      send,
    };
    connectedClients.set(clientId, client);
  }

  client.markets.add(marketId);
  console.log(`📡 Client ${clientId} subscribed to market ${marketId}`);
}

/**
 * Unsubscribe a client from a market
 */
function unsubscribeClient(clientId: string, marketId: string): void {
  const client = connectedClients.get(clientId);
  if (client) {
    client.markets.delete(marketId);

    if (client.markets.size === 0) {
      connectedClients.delete(clientId);
      console.log(`📡 Client ${clientId} disconnected`);
    }
  }
}

/**
 * Hono WebSocket upgrade handler
 * Client protocol:
 * - SUBSCRIBE: { type: "subscribe", marketId: "..." }
 * - UNSUBSCRIBE: { type: "unsubscribe", marketId: "..." }
 */
export default function wsHandler(c: any) {
  return c.upgrade(async (ws: any) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`🟢 WebSocket client connected: ${clientId}`);

    // Ensure Polymarket connection is active
    await connectToPolymarketWs();

    ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "subscribe") {
          subscribeClient(
            clientId,
            message.marketId,
            async (data) => {
              ws.send(JSON.stringify(data));
            }
          );
        } else if (message.type === "unsubscribe") {
          unsubscribeClient(clientId, message.marketId);
        }
      } catch (error) {
        console.error("WebSocket message handler error:", error);
      }
    });

    ws.addEventListener("close", () => {
      console.log(`🔴 WebSocket client disconnected: ${clientId}`);
      connectedClients.delete(clientId);
    });
  });
}

/**
 * Generate mock price updates for testing (when no real Polymarket connection)
 */
export function startMockPriceGenerator(): void {
  console.log("🎲 Starting mock price generator...");

  const mockMarkets = [
    "0x1234567890abcdef",
    "0xfedcba0987654321",
  ];

  setInterval(() => {
    const market = mockMarkets[Math.floor(Math.random() * mockMarkets.length)];
    const basePrice = 0.5;
    const variation = (Math.random() - 0.5) * 0.1;
    const price = Math.max(0.01, Math.min(0.99, basePrice + variation));

    const update: PriceUpdate = {
      marketId: market,
      price: Math.round(price * 100) / 100,
      bid: Math.round((price - 0.02) * 100) / 100,
      ask: Math.round((price + 0.02) * 100) / 100,
      timestamp: Date.now(),
    };

    handlePriceUpdate(update);
  }, 3000); // Update every 3 seconds
}
