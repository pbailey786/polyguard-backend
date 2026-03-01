/**
 * CLOB Client Integration
 * Wrapper around @polymarket/clob-client for order placement and management
 * TODO: Integrate with actual @polymarket/clob-client SDK once available
 */

import axios from "axios";
import { config } from "../config";
import type { OrderExecutionRequest, OrderExecutionResponse } from "../types";

interface ClobOrder {
  id: string;
  marketId: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  status: "open" | "filled" | "cancelled";
  createdAt: number;
  filledAmount?: number;
}

/**
 * CLOB Client wrapper
 * Handles authentication, order placement, and market data
 */
export class ClobClient {
  private apiUrl: string;
  private orders: Map<string, ClobOrder> = new Map();

  constructor() {
    this.apiUrl = config.polymarketClibUrl;
  }

  /**
   * Generate a mock order ID (replace with real CLOB API call)
   */
  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Place a limit order on Polymarket
   * This is a PAPER TRADING mock - actual execution requires CLOB API integration
   */
  async placeOrder(request: OrderExecutionRequest): Promise<OrderExecutionResponse> {
    try {
      if (config.paperTrading) {
        // PAPER TRADING: Simulate order placement
        const orderId = this.generateOrderId();

        const order: ClobOrder = {
          id: orderId,
          marketId: request.marketId,
          side: request.side,
          amount: request.amount,
          price: request.price || 0.5, // Default midpoint
          status: "open",
          createdAt: Date.now(),
        };

        this.orders.set(orderId, order);

        console.log(
          `📄 [PAPER] Order placed: ${orderId}`,
          request.side.toUpperCase(),
          `${request.amount} @ ${request.price || 0.5}`
        );

        return {
          success: true,
          orderId,
          paperTrade: true,
        };
      }

      // REAL TRADING: Call actual CLOB API
      // TODO: Implement real order placement once builder code is registered
      console.warn("🚫 Real trading not yet enabled");
      return {
        success: false,
        error: "Real trading disabled - use PAPER_TRADING mode",
      };
    } catch (error) {
      console.error("Order placement error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Order placement failed",
      };
    }
  }

  /**
   * Place a Sell (FOK) order when stop-loss is triggered
   * FOK = Fill or Kill (immediate execution or cancel)
   */
  async placeStopLossOrder(
    marketId: string,
    amount: number,
    price: number,
    builderCode: string
  ): Promise<OrderExecutionResponse> {
    try {
      const request: OrderExecutionRequest = {
        marketId,
        side: "sell",
        amount,
        price,
        builderCode,
      };

      const response = await this.placeOrder(request);

      if (response.success) {
        console.log(`🛑 Stop-loss order executed: ${response.orderId}`);
      }

      return response;
    } catch (error) {
      console.error("Stop-loss order error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stop-loss failed",
      };
    }
  }

  /**
   * Get order status
   */
  getOrderStatus(orderId: string): ClobOrder | null {
    return this.orders.get(orderId) || null;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = this.orders.get(orderId);

      if (!order) {
        return {
          success: false,
          error: "Order not found",
        };
      }

      if (order.status !== "open") {
        return {
          success: false,
          error: `Cannot cancel order in ${order.status} status`,
        };
      }

      order.status = "cancelled";
      console.log(`❌ Order cancelled: ${orderId}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cancellation failed",
      };
    }
  }

  /**
   * Get market data (price, liquidity, etc.)
   * TODO: Connect to real Polymarket API
   */
  async getMarketData(
    marketId: string
  ): Promise<{ bid: number; ask: number; lastPrice: number } | null> {
    try {
      // Mock market data
      const mockData = {
        bid: 0.45,
        ask: 0.55,
        lastPrice: 0.50,
      };

      console.log(`📊 Market data for ${marketId}:`, mockData);
      return mockData;
    } catch (error) {
      console.error("Market data fetch error:", error);
      return null;
    }
  }

  /**
   * Get all open orders for debugging
   */
  getOpenOrders(): ClobOrder[] {
    return Array.from(this.orders.values()).filter((o) => o.status === "open");
  }

  /**
   * Get order history
   */
  getOrderHistory(): ClobOrder[] {
    return Array.from(this.orders.values());
  }
}

// Singleton instance
let clobClient: ClobClient;

export function getClobClient(): ClobClient {
  if (!clobClient) {
    clobClient = new ClobClient();
  }
  return clobClient;
}
