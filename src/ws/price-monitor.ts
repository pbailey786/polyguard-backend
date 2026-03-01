/**
 * WebSocket Price Monitor - Phase 3
 * Real-time price monitoring from Polymarket with stop-loss trigger logic
 * Connects to Polymarket WebSocket and triggers sell orders when prices hit thresholds
 */

import WebSocket from "ws";
import { config } from "../config";
import { getAllActiveStopLosses } from "../db/services/stoploss.service";
import { getClobClient } from "../trading/clob-client-phase3";
import type { PriceUpdate } from "../types";

interface MarketSubscriber {
  marketId: string;
  onPrice: (update: PriceUpdate) => void;
}

/**
 * WebSocket Price Monitor with Stop-Loss Automation
 * Monitors real Polymarket prices and executes stop-loss orders
 */
export class PriceMonitor {
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, MarketSubscriber[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private priceCache: Map<string, PriceUpdate> = new Map();
  private monitoringActive = false;

  constructor() {
    this.wsUrl = config.polymarketWsUrl;
    console.log("🔌 Price Monitor initialized");
    console.log(`   WebSocket URL: ${this.wsUrl}`);
  }

  /**
   * Connect to Polymarket WebSocket
   */
  async connect(): Promise<void> {
    try {
      console.log("🔗 Connecting to Polymarket WebSocket...");

      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => this.onOpen());
      this.ws.on("message", (data) => this.onMessage(data));
      this.ws.on("error", (error) => this.onError(error));
      this.ws.on("close", () => this.onClose());

      // Wait for connection to establish
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 5000);

        if (this.ws?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve(true);
        } else if (this.ws) {
          this.ws.once("open", () => {
            clearTimeout(timeout);
            resolve(true);
          });
        }
      });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      throw error;
    }
  }

  /**
   * Handle WebSocket open
   */
  private onOpen(): void {
    console.log("✅ WebSocket connected to Polymarket");
    this.reconnectAttempts = 0;
    this.monitoringActive = true;

    // Subscribe to active stop-loss markets
    this.subscribeToStopLosses();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle different message types
      if (message.type === "price_update") {
        this.handlePriceUpdate(message);
      } else if (message.type === "market_data") {
        this.handleMarketData(message);
      } else if (message.type === "subscription_confirmation") {
        console.log(`✅ Subscribed to market: ${message.marketId}`);
      }
    } catch (error) {
      console.error("WebSocket message parse error:", error);
    }
  }

  /**
   * Handle price update from WebSocket
   */
  private async handlePriceUpdate(message: any): Promise<void> {
    const update: PriceUpdate = {
      marketId: message.marketId,
      price: parseFloat(message.price),
      bid: message.bid ? parseFloat(message.bid) : undefined,
      ask: message.ask ? parseFloat(message.ask) : undefined,
      timestamp: Date.now(),
    };

    // Cache price
    this.priceCache.set(update.marketId, update);

    // Notify subscribers
    const subs = this.subscribers.get(update.marketId) || [];
    for (const sub of subs) {
      sub.onPrice(update);
    }

    // Check for stop-loss triggers
    await this.checkStopLossTriggers(update);
  }

  /**
   * Handle market data message
   */
  private handleMarketData(message: any): void {
    const update: PriceUpdate = {
      marketId: message.marketId,
      price: message.lastPrice,
      bid: message.bid,
      ask: message.ask,
      timestamp: Date.now(),
    };

    this.priceCache.set(update.marketId, update);
    console.log(`📊 Market data: ${update.marketId} @ ${update.price}`);
  }

  /**
   * Check if any stop-losses should be triggered
   */
  private async checkStopLossTriggers(priceUpdate: PriceUpdate): Promise<void> {
    try {
      const activeStopLosses = await getAllActiveStopLosses();

      for (const stopLoss of activeStopLosses) {
        // Skip if not for this market
        if (stopLoss.marketId !== priceUpdate.marketId) {
          continue;
        }

        const triggerPrice = parseFloat(stopLoss.triggerPrice);

        // Check if price has fallen to or below trigger price
        // (sell orders trigger when price drops)
        if (priceUpdate.price <= triggerPrice) {
          console.log(`🛑 STOP-LOSS TRIGGERED: ${stopLoss.id}`);
          console.log(`   Market: ${stopLoss.marketId}`);
          console.log(`   Trigger Price: ${triggerPrice}`);
          console.log(`   Current Price: ${priceUpdate.price}`);

          // Execute stop-loss order
          await this.executeStopLoss(stopLoss, priceUpdate);
        }
      }
    } catch (error) {
      console.error("Error checking stop-loss triggers:", error);
    }
  }

  /**
   * Execute stop-loss order when triggered
   */
  private async executeStopLoss(
    stopLoss: { id: string; userId: string; marketId: string; quantity: string },
    priceUpdate: PriceUpdate
  ): Promise<void> {
    try {
      const clobClient = getClobClient();

      const response = await clobClient.executeStopLossOrder(
        stopLoss.id as string,
        stopLoss.userId,
        stopLoss.marketId,
        parseFloat(stopLoss.quantity),
        priceUpdate.price
      );

      if (response.success) {
        console.log(
          `✅ Stop-loss executed successfully: Order ${response.orderId}`
        );
      } else {
        console.error(`❌ Stop-loss execution failed: ${response.error}`);
      }
    } catch (error) {
      console.error("Error executing stop-loss:", error);
    }
  }

  /**
   * Subscribe to stop-loss markets
   */
  private async subscribeToStopLosses(): Promise<void> {
    try {
      const stopLosses = await getAllActiveStopLosses();
      const marketIds = new Set(stopLosses.map((sl: { marketId: string }) => sl.marketId));

      console.log(`📡 Subscribing to ${marketIds.size} markets for stop-loss monitoring`);

      for (const marketId of marketIds) {
        this.subscribeToMarket(marketId as string);
      }
    } catch (error) {
      console.error("Error subscribing to stop-loss markets:", error);
    }
  }

  /**
   * Subscribe to a market for price updates
   */
  subscribe(marketId: string, onPrice: (update: PriceUpdate) => void): void {
    if (!this.subscribers.has(marketId)) {
      this.subscribers.set(marketId, []);
    }

    this.subscribers.get(marketId)!.push({ marketId, onPrice });
    console.log(`📊 Subscribed to market: ${marketId}`);

    // If WebSocket is connected, send subscription
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToMarket(marketId);
    }
  }

  /**
   * Send market subscription to WebSocket
   */
  private subscribeToMarket(marketId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`⚠️ WebSocket not connected, cannot subscribe to ${marketId}`);
      return;
    }

    try {
      this.ws.send(
        JSON.stringify({
          type: "subscribe",
          marketId,
        })
      );
    } catch (error) {
      console.error(`Error subscribing to market ${marketId}:`, error);
    }
  }

  /**
   * Unsubscribe from a market
   */
  unsubscribe(marketId: string, onPrice: (update: PriceUpdate) => void): void {
    const subs = this.subscribers.get(marketId);
    if (!subs) return;

    const index = subs.findIndex((s) => s.onPrice === onPrice);
    if (index > -1) {
      subs.splice(index, 1);
    }

    if (subs.length === 0) {
      this.subscribers.delete(marketId);
      console.log(`📊 Unsubscribed from market: ${marketId}`);
    }
  }

  /**
   * Get cached price for a market
   */
  getPrice(marketId: string): PriceUpdate | null {
    return this.priceCache.get(marketId) || null;
  }

  /**
   * Handle WebSocket error
   */
  private onError(error: Error): void {
    console.error("❌ WebSocket error:", error);
  }

  /**
   * Handle WebSocket close
   */
  private onClose(): void {
    console.log("❌ WebSocket disconnected");
    this.monitoringActive = false;

    // Attempt reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `🔄 Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
        });
      }, delay);
    } else {
      console.error("❌ Max reconnection attempts reached");
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.monitoringActive = false;
    console.log("🔌 WebSocket disconnected");
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.monitoringActive && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscribers.size;
  }
}

// Singleton instance
let priceMonitor: PriceMonitor;

export function getPriceMonitor(): PriceMonitor {
  if (!priceMonitor) {
    priceMonitor = new PriceMonitor();
  }
  return priceMonitor;
}
