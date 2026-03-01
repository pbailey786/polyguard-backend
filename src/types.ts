// Authentication & User
export interface AuthSession {
  address: string;
  nonce: string;
  expiresAt: Date;
}

export interface SignedMessage {
  message: string;
  signature: string;
}

export interface SIWERequest {
  message: string;
  signature: string;
}

export interface SIWEResponse {
  success: boolean;
  address?: string;
  token?: string;
  error?: string;
}

// Trading & Orders
export interface StopLossOrder {
  id: string;
  userId: string;
  marketId: string;
  stopPrice: number;
  triggerPrice: number;
  createdAt: Date;
  triggered?: boolean;
}

export interface OrderExecutionRequest {
  marketId: string;
  side: "buy" | "sell";
  amount: number;
  price?: number;
  builderCode: string;
}

export interface OrderExecutionResponse {
  success: boolean;
  orderId?: string;
  clobOrderId?: string;
  transactionHash?: string;
  error?: string;
  paperTrade?: boolean;
  message?: string;
}

// WebSocket & Price Data
export interface PriceUpdate {
  marketId: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: number;
}

export interface MarketSubscription {
  marketId: string;
  callbacks: ((update: PriceUpdate) => void)[];
}

// Builder Signing
export interface BuilderSigningRequest {
  orderId: string;
  marketId: string;
  amount: number;
  price: number;
}

export interface BuilderSigningResponse {
  success: boolean;
  signature?: string;
  error?: string;
}

// API Responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}
