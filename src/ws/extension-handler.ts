/**
 * WebSocket Handler for Chrome Extension
 * Real-time order updates and execution confirmations
 * 
 * Protocol:
 * Client → Server:
 *   { type: "register", userId: "...", token: "..." }
 *   { type: "execute_order", marketId: "...", side: "buy|sell", amount: 100, price: 0.50 }
 *   { type: "cancel_order", orderId: "..." }
 *   { type: "get_orders" }
 * 
 * Server → Client:
 *   { type: "registered", clientId: "...", stats: {...} }
 *   { type: "order_update", order: {...} }
 *   { type: "error", message: "..." }
 */

import { Hono } from "hono";
import { verifySession } from "../auth/siwe";
import { getPhase4Executor } from "../trading/phase4-executor";
import { getUserOrders, getOrderById } from "../db/services/orders.service";
import type { OrderExecutionRequest } from "../types";

interface ExtensionClient {
  userId: string;
  clientId: string;
  token: string;
  ws: any;
  registeredAt: number;
}

const extensionClients = new Map<string, ExtensionClient>();

/**
 * Handle incoming messages from extension
 */
async function handleExtensionMessage(
  client: ExtensionClient,
  message: any
): Promise<void> {
  try {
    console.log(`📱 Extension message (${client.userId}):`, message.type);

    switch (message.type) {
      case "execute_order":
        await handleExecuteOrder(client, message);
        break;

      case "cancel_order":
        await handleCancelOrder(client, message);
        break;

      case "get_orders":
        await handleGetOrders(client);
        break;

      case "get_stats":
        await handleGetStats(client);
        break;

      case "get_order_history":
        await handleGetOrderHistory(client);
        break;

      default:
        sendToClient(client, {
          type: "error",
          message: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("Extension message handler error:", error);
    sendToClient(client, {
      type: "error",
      message: error instanceof Error ? error.message : "Internal error",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle order execution request from extension
 */
async function handleExecuteOrder(client: ExtensionClient, message: any): Promise<void> {
  try {
    const executor = getPhase4Executor();

    const request = {
      userId: client.userId,
      marketId: message.marketId,
      side: message.side,
      amount: message.amount,
      price: message.price,
    };

    // Execute order
    const result = await executor.executeOrder(request);

    // Send result back to extension
    if (result.success && result.orderId) {
      sendToClient(client, {
        type: "order_executed",
        data: {
          orderId: result.orderId,
          clobOrderId: result.clobOrderId,
          transactionHash: result.transactionHash,
          paperTrade: result.paperTrade,
          message: `Order ${result.orderId.substring(0, 8)}... placed successfully`,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      sendToClient(client, {
        type: "order_failed",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    sendToClient(client, {
      type: "error",
      message: error instanceof Error ? error.message : "Order execution failed",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle order cancellation request from extension
 */
async function handleCancelOrder(client: ExtensionClient, message: any): Promise<void> {
  try {
    const executor = getPhase4Executor();
    const result = await executor.cancelOrder(message.orderId, client.userId);

    if (result.success) {
      sendToClient(client, {
        type: "order_cancelled",
        data: {
          orderId: message.orderId,
          message: "Order cancelled successfully",
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      sendToClient(client, {
        type: "error",
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    sendToClient(client, {
      type: "error",
      message: error instanceof Error ? error.message : "Cancellation failed",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get open orders for user
 */
async function handleGetOrders(client: ExtensionClient): Promise<void> {
  try {
    const executor = getPhase4Executor();
    const orders = await executor.getUserOpenOrders(client.userId);

    sendToClient(client, {
      type: "orders",
      data: {
        orders,
        count: orders.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendToClient(client, {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to fetch orders",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get execution stats
 */
async function handleGetStats(client: ExtensionClient): Promise<void> {
  try {
    const executor = getPhase4Executor();
    const stats = executor.getStats();

    sendToClient(client, {
      type: "stats",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendToClient(client, {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to fetch stats",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get order history (last 50 orders)
 */
async function handleGetOrderHistory(client: ExtensionClient): Promise<void> {
  try {
    const orders = await getUserOrders(client.userId);
    const history = orders.slice(0, 50);

    sendToClient(client, {
      type: "order_history",
      data: {
        orders: history,
        count: history.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendToClient(client, {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to fetch history",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Send message to extension client
 */
function sendToClient(client: ExtensionClient, data: any): void {
  try {
    client.ws.send(JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to send to client ${client.clientId}:`, error);
  }
}

/**
 * Broadcast message to all connected extension clients for a user
 */
function broadcastToUserClients(userId: string, data: any): void {
  extensionClients.forEach((client) => {
    if (client.userId === userId) {
      sendToClient(client, data);
    }
  });
}

/**
 * Hono WebSocket upgrade handler for extension
 */
export default function extensionHandler(c: any) {
  return c.upgrade(async (ws: any) => {
    const clientId = `ext_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let client: ExtensionClient | null = null;

    console.log(`🟢 Extension WebSocket client connecting: ${clientId}`);

    ws.addEventListener("message", async (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string);

        // First message must be registration
        if (!client && message.type !== "register") {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "First message must be register",
            })
          );
          return;
        }

        // Register client
        if (message.type === "register") {
          // Verify auth token
          const session = verifySession(message.token);
          if (!session) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Invalid or expired token",
              })
            );
            return;
          }

          client = {
            userId: session.address || message.userId,
            clientId,
            token: message.token,
            ws,
            registeredAt: Date.now(),
          };

          extensionClients.set(clientId, client);
          const executor = getPhase4Executor();
          executor.registerClient(clientId, (data) => sendToClient(client!, data));

          console.log(`✅ Extension client registered: ${client.userId}`);

          ws.send(
            JSON.stringify({
              type: "registered",
              clientId,
              userId: client.userId,
              stats: executor.getStats(),
              timestamp: new Date().toISOString(),
            })
          );

          return;
        }

        // Handle other messages (require registration)
        if (client) {
          await handleExtensionMessage(client, message);
        }
      } catch (error) {
        console.error("Extension WebSocket message error:", error);
        if (client) {
          sendToClient(client, {
            type: "error",
            message: "Failed to process message",
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    ws.addEventListener("close", () => {
      if (client) {
        console.log(`🔴 Extension client disconnected: ${client.clientId}`);
        const executor = getPhase4Executor();
        executor.unregisterClient(client.clientId);
        extensionClients.delete(clientId);
      }
    });

    ws.addEventListener("error", (error: any) => {
      console.error(`Extension WebSocket error (${clientId}):`, error);
      if (client) {
        extensionClients.delete(clientId);
      }
    });
  });
}

/**
 * Export for use in other modules
 */
export { broadcastToUserClients };
