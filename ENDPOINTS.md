# PolyGuard Backend API Endpoints

**Base URL:** `http://localhost:3000` (development)

---

## 🏥 Health Check

### GET /health
Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T03:15:00.000Z",
  "version": "0.1.0"
}
```

---

## 🔐 Authentication (`/auth`)

### GET /auth/nonce
Generate a nonce for SIWE challenge.

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123def456",
    "message": "Use this nonce to sign in with Ethereum"
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### POST /auth/message
Create a SIWE message to sign.

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb",
  "nonce": "abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "localhost wants you to sign in with your Ethereum account:\n0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb\n\nSign in with Ethereum to PolyGuard\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1\nNonce: abc123def456\nIssued At: 2026-03-01T03:15:00.000Z\nExpiration Time: 2026-03-01T03:30:00.000Z"
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### POST /auth/verify
Verify signed SIWE message and create session.

**Request:**
```json
{
  "message": "...",  // from /auth/message
  "signature": "0x..."  // signed by user's wallet
}
```

**Response:**
```json
{
  "success": true,
  "address": "0x742d35cc6634c0532925a3b844bc9e7595f6beb",
  "token": "session_abc123def456"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Signature address mismatch"
}
```

---

### GET /auth/verify-session
Check session validity.

**Headers:**
```
Authorization: Bearer session_abc123def456
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f6beb",
    "expiresAt": "2026-03-08T03:15:00.000Z"
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### POST /auth/logout
Invalidate session token.

**Headers:**
```
Authorization: Bearer session_abc123def456
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

## 🔑 Builder Signing (`/signing`)

### POST /signing/builder-sign
Sign an order with builder code attribution.

**Headers:**
```
Authorization: Bearer session_abc123def456
Content-Type: application/json
```

**Request:**
```json
{
  "orderId": "order_1234567890",
  "marketId": "0x1234567890abcdef",
  "amount": 100,
  "price": 0.50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_1234567890",
    "signature": "abc123def456...",
    "timestamp": 1704110100,
    "builderCode": "builder_code_here"
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### POST /signing/batch-sign
Sign multiple orders in one request.

**Headers:**
```
Authorization: Bearer session_abc123def456
Content-Type: application/json
```

**Request:**
```json
{
  "orders": [
    {
      "orderId": "order_1",
      "marketId": "0x1234...",
      "amount": 100,
      "price": 0.50
    },
    {
      "orderId": "order_2",
      "marketId": "0x5678...",
      "amount": 50,
      "price": 0.75
    }
  ]
}
```

**Response (207 Multi-Status):**
```json
{
  "success": true,
  "data": {
    "signed": 2,
    "failed": 0,
    "signedOrders": [
      {
        "orderId": "order_1",
        "signature": "abc...",
        "timestamp": 1704110100,
        "builderCode": "builder_code"
      },
      {
        "orderId": "order_2",
        "signature": "def...",
        "timestamp": 1704110100,
        "builderCode": "builder_code"
      }
    ],
    "errors": []
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

## 💱 Trading (`/trading`)

### POST /trading/execute
Place an order (buy or sell).

**Headers:**
```
Authorization: Bearer session_abc123def456
Content-Type: application/json
```

**Request:**
```json
{
  "marketId": "0x1234567890abcdef",
  "side": "buy",
  "amount": 100,
  "price": 0.50
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_1704110100_abc123",
    "marketId": "0x1234567890abcdef",
    "side": "buy",
    "amount": 100,
    "price": 0.50,
    "paperTrade": true
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### POST /trading/stop-loss
Execute a stop-loss sell order (FOK).

**Headers:**
```
Authorization: Bearer session_abc123def456
Content-Type: application/json
```

**Request:**
```json
{
  "marketId": "0x1234567890abcdef",
  "amount": 100,
  "price": 0.40
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "orderId": "sl_1704110100_xyz789",
    "marketId": "0x1234567890abcdef",
    "amount": 100,
    "price": 0.40,
    "type": "stop-loss-sell",
    "paperTrade": true
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### GET /trading/orders
List all open orders.

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_1704110100_abc123",
        "marketId": "0x1234567890abcdef",
        "side": "buy",
        "amount": 100,
        "price": 0.50,
        "status": "open",
        "createdAt": 1704110100
      },
      {
        "id": "sl_1704110100_xyz789",
        "marketId": "0x1234567890abcdef",
        "side": "sell",
        "amount": 100,
        "price": 0.40,
        "status": "open",
        "createdAt": 1704110105
      }
    ]
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### GET /trading/orders/:orderId
Get order status.

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "order_1704110100_abc123",
      "marketId": "0x1234567890abcdef",
      "side": "buy",
      "amount": 100,
      "price": 0.50,
      "status": "open",
      "createdAt": 1704110100
    }
  },
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Order not found",
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

### POST /trading/orders/:orderId/cancel
Cancel an order.

**Headers:**
```
Authorization: Bearer session_abc123def456
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Cannot cancel order in filled status",
  "timestamp": "2026-03-01T03:15:00.000Z"
}
```

---

## 📡 WebSocket (`/ws/prices`)

Real-time price monitoring via WebSocket.

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/prices');

// Subscribe to market
ws.send(JSON.stringify({
  type: 'subscribe',
  marketId: '0x1234567890abcdef'
}));

// Listen for updates
ws.addEventListener('message', (event) => {
  const update = JSON.parse(event.data);
  console.log('Price update:', update);
});

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  marketId: '0x1234567890abcdef'
}));
```

**Price Update Message:**
```json
{
  "type": "price",
  "data": {
    "marketId": "0x1234567890abcdef",
    "price": 0.52,
    "bid": 0.50,
    "ask": 0.54,
    "timestamp": 1704110100000
  }
}
```

---

## Error Codes

| HTTP | Error | Meaning |
|------|-------|---------|
| 200 | - | Success |
| 201 | - | Resource created |
| 207 | - | Multi-status (batch partial success) |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource not found |
| 500 | Internal Error | Server error |

---

## Testing with cURL

### Complete Auth Flow
```bash
# 1. Get nonce
NONCE=$(curl -s http://localhost:3000/auth/nonce | jq -r '.data.nonce')

# 2. Create message
MESSAGE=$(curl -s -X POST http://localhost:3000/auth/message \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb\", \"nonce\": \"$NONCE\"}" \
  | jq -r '.data.message')

# 3. Sign message (OFFLINE with wallet)
# ... user signs in wallet ...
# SIGNATURE = "0x..."

# 4. Verify (assumes SIGNATURE in env var)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$MESSAGE\", \"signature\": \"$SIGNATURE\"}" \
  | jq -r '.token')

# 5. Use token for authenticated requests
curl -s -X POST http://localhost:3000/trading/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"marketId": "0x123...", "side": "buy", "amount": 100, "price": 0.50}'
```

---

## Rate Limiting

Currently **NOT IMPLEMENTED** (TODO for production):
- Auth endpoints: 10 req/min per IP
- Trading endpoints: 30 req/min per user
- WebSocket: 1 connection per user

---

## CORS

Configured to accept:
- `http://localhost:3000`
- `chrome-extension://` (from `EXTENSION_ORIGIN` env var)

---

**Last Updated:** 2026-03-01  
**API Version:** 0.1.0  
