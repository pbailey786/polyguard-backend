# Phase 4 - Real Order Execution Testing Guide

## Overview

This document provides comprehensive testing procedures for Phase 4 real order execution + frontend integration.

## Testing Checklist

### 1. Backend Startup

```bash
cd /root/.openclaw/workspace/polyguard-backend

# Terminal 1: Start backend
npm run dev

# Expected output:
# 🚀 PolyGuard Backend - Phase 4 starting on port 3000
# 📍 Environment: development
# 🎯 PAPER_TRADING: true
# 📡 WebSocket /ws/prices (Polymarket price feed)
# 📱 WebSocket /ws/extension (Chrome extension updates)
```

### 2. Health Check

```bash
curl -X GET http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-03-01T03:39:00.000Z",
#   "version": "0.4.0",
#   "phase": "4-real-execution"
# }
```

### 3. Phase 4 Status

```bash
curl -X GET http://localhost:3000/status/phase4

# Expected response shows executor stats:
# {
#   "phase": 4,
#   "status": "active",
#   "executor": {
#     "mode": "PAPER|REAL",
#     "builderCode": "...",
#     "connectedClients": 0,
#     "maxOrderSize": 1000,
#     "maxDailyTrades": 100,
#     "minBalance": 10
#   }
# }
```

## Authentication Flow

### Step 1: Get Nonce

```bash
curl -X POST http://localhost:3000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"}'

# Response:
# {
#   "nonce": "...",
#   "expiresIn": 3600
# }
```

### Step 2: Sign Nonce (use ethers.js in browser/extension)

```javascript
// In Chrome extension or browser
const message = `PolyGuard verification\nnonce: ${nonce}`;
const signature = await signer.signMessage(message);
```

### Step 3: Verify and Get Token

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0",
    "nonce": "...",
    "signature": "0x..."
  }'

# Response:
# {
#   "success": true,
#   "token": "eyJ...",
#   "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0"
# }
```

## Order Execution Testing

### Test 1: Execute Paper Order

```bash
TOKEN="<your-auth-token>"

curl -X POST http://localhost:3000/trading/execute/real \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x1234567890abcdef",
    "side": "sell",
    "amount": 100,
    "price": 0.50
  }'

# Expected response (Paper Mode):
# {
#   "success": true,
#   "data": {
#     "orderId": "...",
#     "paperTrade": true,
#     "message": "[PAPER] Order simulated fill"
#   },
#   "timestamp": "2026-03-01T03:39:00.000Z"
# }
```

### Test 2: Validate Safety Guards

#### Test: Order Too Large

```bash
curl -X POST http://localhost:3000/trading/execute/real \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x1234567890abcdef",
    "side": "buy",
    "amount": 10000,
    "price": 0.50
  }'

# Expected: 400 Bad Request
# {
#   "success": false,
#   "error": "Order size $5000.00 exceeds max $1000"
# }
```

#### Test: Rate Limiting (10+ requests per minute)

```bash
# Send 11 requests in quick succession
for i in {1..11}; do
  curl -X POST http://localhost:3000/trading/execute/real \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "marketId": "0x1234567890abcdef",
      "side": "sell",
      "amount": 1,
      "price": 0.50
    }'
done

# 11th request should fail:
# {
#   "success": false,
#   "error": "Rate limit exceeded..."
# }
```

### Test 3: Get Open Orders

```bash
curl -X GET http://localhost:3000/trading/orders \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "orders": [
#       {
#         "id": "...",
#         "side": "sell",
#         "amount": "100",
#         "status": "filled",
#         "paperTrade": true
#       }
#     ],
#     "count": 1
#   }
# }
```

### Test 4: Get Specific Order

```bash
curl -X GET "http://localhost:3000/trading/orders/<order-id>" \
  -H "Authorization: Bearer $TOKEN"

# Response includes full order details with timestamps
```

### Test 5: Cancel Order

```bash
curl -X POST http://localhost:3000/trading/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "<order-id>"}'

# Success response:
# {
#   "success": true,
#   "data": { "message": "Order cancelled" }
# }
```

## WebSocket Testing - Extension Integration

### Connect to Extension WebSocket

```javascript
// In browser console or extension content script
const ws = new WebSocket('ws://localhost:3000/ws/extension');

// Listen for connection
ws.onopen = () => {
  console.log('Connected to PolyGuard backend');
  
  // Register with backend
  ws.send(JSON.stringify({
    type: 'register',
    userId: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE0',
    token: '<auth-token>'
  }));
};

// Listen for messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Test: Execute Order via WebSocket

```javascript
// Send order execution request
ws.send(JSON.stringify({
  type: 'execute_order',
  marketId: '0x1234567890abcdef',
  side: 'sell',
  amount: 100,
  price: 0.50
}));

// Listen for response
// {
//   "type": "order_executed",
//   "data": {
//     "orderId": "...",
//     "paperTrade": true
//   }
// }
```

### Test: Get Orders via WebSocket

```javascript
ws.send(JSON.stringify({
  type: 'get_orders'
}));

// Response:
// {
//   "type": "orders",
//   "data": {
//     "orders": [...],
//     "count": 1
//   }
// }
```

### Test: Cancel Order via WebSocket

```javascript
ws.send(JSON.stringify({
  type: 'cancel_order',
  orderId: '<order-id>'
}));

// Response:
// {
//   "type": "order_cancelled",
//   "data": {
//     "orderId": "...",
//     "message": "Order cancelled successfully"
//   }
// }
```

### Test: Get Stats

```javascript
ws.send(JSON.stringify({
  type: 'get_stats'
}));

// Response shows real-time executor stats
```

### Test: Get Order History

```javascript
ws.send(JSON.stringify({
  type: 'get_order_history'
}));

// Response includes last 50 orders
```

## Real Mode Testing (When Credentials Available)

### Enable Real Mode

```bash
# Set in .env
PAPER_TRADING=false
```

### Verify Real Mode Active

```bash
curl http://localhost:3000/status/phase4 | grep "\"mode\""

# Should show:
# "mode": "REAL"
```

### Test Real Order Execution

When real mode is enabled:

1. Real @polymarket/clob-client SDK will be used
2. Orders will be placed on Polymarket CLOB
3. Transaction hashes will be returned
4. Builder attribution will be applied

```bash
curl -X POST http://localhost:3000/trading/execute/real \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0xabcd1234ef567890...",
    "side": "sell",
    "amount": 100,
    "price": 0.50
  }'

# Real mode response:
# {
#   "success": true,
#   "data": {
#     "orderId": "...",
#     "clobOrderId": "...",
#     "transactionHash": "0x...",
#     "paperTrade": false
#   }
# }
```

## Extension Integration Testing

### Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select `/root/.openclaw/workspace/polyguard-phase1/dist/`

### Test in Extension

1. Open extension popup
2. Click "Connect Wallet"
3. Sign authentication message
4. Click "Add Order"
   - Market ID: `0x1234567890abcdef`
   - Side: `sell`
   - Amount: `100`
   - Price: `0.50`
5. Verify order appears in popup
6. Verify order updates in real-time
7. Click "Execute" to place order
8. Verify confirmation appears
9. Click "Cancel" to cancel order
10. Verify cancellation in real-time

## Performance Metrics

### Measure Response Times

```bash
# Order execution time (should be <500ms)
time curl -X POST http://localhost:3000/trading/execute/real \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"marketId": "0x1234...", "side": "sell", "amount": 100}'

# WebSocket latency (check browser console)
console.time('order');
ws.send(JSON.stringify({type: 'execute_order', ...}));
// After response received:
console.timeEnd('order');
```

### Load Test

```bash
# Simulate 10 concurrent users
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -p order.json \
  http://localhost:3000/trading/execute/real

# Expect:
# - All requests succeed
# - Avg response time <500ms
# - 0 connection errors
```

## Database Verification

### Check Orders Created

```bash
# In Supabase SQL editor
SELECT * FROM orders WHERE user_id = '...' ORDER BY created_at DESC LIMIT 10;

# Verify:
# - All fields populated
# - Status correct (pending/filled/cancelled)
# - Timestamps accurate
# - Builder code attribution present
```

### Check Transactions Logged

```bash
SELECT * FROM transactions WHERE user_id = '...' ORDER BY timestamp DESC;

# Verify:
# - Builder fee calculated (0.5%)
# - Transaction hash recorded
# - Profit/loss tracked
```

### Check Price History

```bash
SELECT * FROM price_history WHERE market_id = '...' ORDER BY timestamp DESC;

# Verify prices logged for monitoring
```

## Error Handling Tests

### Invalid Token

```bash
curl -X POST http://localhost:3000/trading/execute/real \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"marketId": "...", "side": "sell", "amount": 100}'

# Expected: 401 Unauthorized
```

### Missing Required Fields

```bash
curl -X POST http://localhost:3000/trading/execute/real \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"marketId": "0x1234"}'

# Expected: 400 Bad Request
# "error": "Validation failed: ..."
```

### Non-existent Order

```bash
curl -X GET "http://localhost:3000/trading/orders/fake-id" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found
```

## Success Criteria

All of the following must pass:

- [ ] Backend starts without errors
- [ ] Health check returns 200
- [ ] Phase 4 status endpoint works
- [ ] Auth flow works (nonce → sign → verify)
- [ ] Paper order execution works
- [ ] Safety guards block invalid orders
- [ ] Rate limiting works
- [ ] Get orders returns correct data
- [ ] Cancel order works
- [ ] WebSocket connects successfully
- [ ] Order execution via WebSocket works
- [ ] Real-time updates broadcast correctly
- [ ] Extension can connect and execute orders
- [ ] Database logging works
- [ ] Error handling is comprehensive
- [ ] Response times acceptable (<500ms)
- [ ] No console errors or warnings

## Next Steps

1. ✅ Phase 4 backend complete - real execution engine
2. 📱 Update Phase 1 extension to use new WebSocket endpoints
3. 🧪 Run comprehensive testing
4. 🚀 Deploy to production
5. 📊 Monitor execution metrics and builder fees

---

**Ready to test? Let's ship real trading! 🔨**
