# Phase 3 Testing Endpoints

Complete guide to test all Phase 3 features with curl commands.

## Prerequisites

- Server running: `npm run dev`
- Replace `YOUR_WALLET` with a test address
- Replace `YOUR_TOKEN` with auth token from SIWE flow

## 1. Health Checks

### Check Server Health
```bash
curl http://localhost:3000/health

# Expected: { "status": "ok", "database": true, "websocket": true }
```

### Check Database Connection
```bash
curl http://localhost:3000/db/health

# Expected: { "healthy": true, "connection": "ok" }
```

### Check WebSocket Status
```bash
curl http://localhost:3000/ws/status

# Expected: { "connected": true, "subscriptions": N, "prices": {...} }
```

## 2. User Management

### Create/Get User
```bash
curl -X POST http://localhost:3000/db/users \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x0000000000000000000000000000000000000001",
    "nonce": "abc123def456"
  }'

# Response includes user ID (save for later)
```

### Get User by Wallet
```bash
curl http://localhost:3000/db/users/0x0000000000000000000000000000000000000001

# Expected: { "success": true, "data": { user object } }
```

### Update User
```bash
curl -X PUT http://localhost:3000/db/users/0x0000000000000000000000000000000000000001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "authToken": "new_token_123"
  }'

# Expected: { "success": true, "data": { updated user } }
```

## 3. Orders

### Create Order (Paper Trading)
```bash
curl -X POST http://localhost:3000/trading/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_STEP_2",
    "marketId": "0xabc123def456789abc123def456789abc123def456789abc123def456789abc",
    "side": "sell",
    "amount": 100,
    "price": 0.50
  }'

# Response: { "success": true, "orderId": "uuid", "status": "pending" }
# Save orderId
```

### Get Order
```bash
curl http://localhost:3000/trading/orders/ORDER_ID_FROM_ABOVE \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": { order object with full details } }
```

### Get User Orders
```bash
curl http://localhost:3000/trading/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": [array of orders] }
```

### Get Open Orders Only
```bash
curl 'http://localhost:3000/trading/orders?status=open' \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": [filtered orders] }
```

### Cancel Order
```bash
curl -X POST http://localhost:3000/trading/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "message": "Order cancelled" }
```

### Get User's P&L
```bash
curl http://localhost:3000/trading/orders/pandl \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": { "totalPandL": "10.50" } }
```

## 4. Stop Losses

### Create Stop-Loss
```bash
curl -X POST http://localhost:3000/trading/stop-losses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "marketId": "0xabc123def456789abc123def456789abc123def456789abc123def456789abc",
    "triggerPrice": 0.40,
    "quantity": 100
  }'

# Response: { "success": true, "stopLossId": "uuid", "status": "active" }
# Save stopLossId
```

### Get Stop-Loss
```bash
curl http://localhost:3000/trading/stop-losses/STOP_LOSS_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": { stop-loss object } }
```

### Get User's Active Stop-Losses
```bash
curl http://localhost:3000/trading/stop-losses \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": [array of active stop-losses] }
```

### Cancel Stop-Loss
```bash
curl -X POST http://localhost:3000/trading/stop-losses/STOP_LOSS_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "message": "Stop-loss cancelled" }
```

## 5. Transactions

### Get User Transactions
```bash
curl http://localhost:3000/trading/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": [array of transactions] }
```

### Get Order Transactions
```bash
curl http://localhost:3000/trading/transactions/order/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "data": [transactions for this order] }
```

### Get User Summary
```bash
curl http://localhost:3000/trading/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {
#   "success": true,
#   "data": {
#     "totalFees": "25.50",
#     "builderFees": "12.75",
#     "profitLoss": "105.20",
#     "totalOrders": 10,
#     "openOrders": 2,
#     "activeStopLosses": 1
#   }
# }
```

### Export Transaction History
```bash
curl http://localhost:3000/trading/transactions/export \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: JSON with full transaction history + summary
# Can save to file: | > transactions.json
```

## 6. Integration Tests

### Complete Trading Flow

#### Step 1: Create User
```bash
WALLET="0xTestWallet123456789012345678901234567890"

USER_RESPONSE=$(curl -s -X POST http://localhost:3000/db/users \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$WALLET\"}")

USER_ID=$(echo $USER_RESPONSE | jq -r '.data.id')
echo "User ID: $USER_ID"
```

#### Step 2: Create Stop-Loss
```bash
STOP_LOSS_RESPONSE=$(curl -s -X POST http://localhost:3000/trading/stop-losses \
  -H "Authorization: Bearer TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"$USER_ID\",
    \"marketId\":\"0x123...\",
    \"triggerPrice\":\"0.40\",
    \"quantity\":\"100\"
  }")

STOP_LOSS_ID=$(echo $STOP_LOSS_RESPONSE | jq -r '.data.id')
echo "Stop-Loss ID: $STOP_LOSS_ID"
```

#### Step 3: Create Order
```bash
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/trading/orders \
  -H "Authorization: Bearer TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\":\"$USER_ID\",
    \"marketId\":\"0x123...\",
    \"side\":\"sell\",
    \"amount\":100,
    \"price\":0.50
  }")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.data.id')
echo "Order ID: $ORDER_ID"
```

#### Step 4: Check Order Status
```bash
curl http://localhost:3000/trading/orders/$ORDER_ID \
  -H "Authorization: Bearer TEST_TOKEN" \
  | jq '.data.status'

# Should return: "pending" → "open" → "filled"
```

#### Step 5: Get Summary
```bash
curl http://localhost:3000/trading/summary \
  -H "Authorization: Bearer TEST_TOKEN" \
  | jq '.data'

# Should show: 1 order, 1 stop-loss, P&L tracking
```

## 7. Performance Tests

### Create Many Orders
```bash
#!/bin/bash
# Test database performance with 100 orders

for i in {1..100}; do
  curl -s -X POST http://localhost:3000/trading/orders \
    -H "Authorization: Bearer TEST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\":\"$USER_ID\",
      \"marketId\":\"0x123...\",
      \"side\":\"sell\",
      \"amount\":100,
      \"price\":0.50
    }" &
  
  # Limit concurrent requests
  if [ $((i % 10)) -eq 0 ]; then
    wait
  fi
done
wait

echo "Created 100 orders"
```

### Query Performance Test
```bash
# Get all orders (should be fast with indexed queries)
time curl http://localhost:3000/trading/orders \
  -H "Authorization: Bearer TEST_TOKEN" > /dev/null

# Get P&L calculation
time curl http://localhost:3000/trading/orders/pandl \
  -H "Authorization: Bearer TEST_TOKEN" > /dev/null
```

## 8. WebSocket Tests

### Monitor WebSocket Events
```bash
# Use websocat if available
websocat ws://localhost:3000/ws/prices

# Or use curl with --raw-socket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:3000/ws/prices
```

### Simulate Price Update
```bash
# Server receives from Polymarket WebSocket
# To test, you'd need to connect directly to Polymarket or mock the data
```

## 9. Error Cases

### Invalid Order
```bash
curl -X POST http://localhost:3000/trading/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "invalid",
    "side": "invalid_side",
    "amount": -100
  }'

# Expected: { "success": false, "error": "Validation failed" }
```

### Missing Authorization
```bash
curl http://localhost:3000/trading/orders

# Expected: { "success": false, "error": "Unauthorized" }
```

### Non-existent Resource
```bash
curl http://localhost:3000/trading/orders/invalid-id \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": false, "error": "Order not found" }
```

### Database Error
```bash
# Simulate by stopping database
# Curl any endpoint
curl http://localhost:3000/trading/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": false, "error": "Database connection failed" }
```

## 10. Batch Testing Script

Save as `test_phase3.sh`:

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
WALLET="0xTestWallet$(date +%s)"
TOKEN="test_token_123"

echo "🧪 Phase 3 Testing"
echo "================================"

# 1. Health checks
echo "1. Health checks..."
curl -s $BASE_URL/health | jq '.status'
curl -s $BASE_URL/db/health | jq '.healthy'

# 2. Create user
echo "2. Creating user..."
USER=$(curl -s -X POST $BASE_URL/db/users \
  -H "Content-Type: application/json" \
  -d "{\"walletAddress\":\"$WALLET\"}")
USER_ID=$(echo $USER | jq -r '.data.id')
echo "   User ID: $USER_ID"

# 3. Create orders
echo "3. Creating orders..."
for i in {1..3}; do
  ORDER=$(curl -s -X POST $BASE_URL/trading/orders \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\":\"$USER_ID\",
      \"marketId\":\"0x$(printf '0%.0s' {1..64})\",
      \"side\":\"sell\",
      \"amount\":100,
      \"price\":0.50
    }")
  echo "   Order $i: $(echo $ORDER | jq -r '.data.id')"
done

# 4. Create stop-losses
echo "4. Creating stop-losses..."
for i in {1..2}; do
  SL=$(curl -s -X POST $BASE_URL/trading/stop-losses \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\":\"$USER_ID\",
      \"marketId\":\"0x$(printf '1%.0s' {1..64})\",
      \"triggerPrice\":\"0.40\",
      \"quantity\":\"100\"
    }")
  echo "   Stop-Loss $i: $(echo $SL | jq -r '.data.id')"
done

# 5. Get summary
echo "5. Getting summary..."
curl -s $BASE_URL/trading/summary \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data'

echo ""
echo "✅ Phase 3 testing complete!"
```

Run it:
```bash
chmod +x test_phase3.sh
./test_phase3.sh
```

## Monitoring During Tests

In another terminal:
```bash
# Watch logs in real-time
tail -f logs/server.log

# Monitor database (in Supabase SQL editor)
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as order_count FROM orders;
SELECT COUNT(*) as sl_count FROM stop_losses;

# Monitor WebSocket
curl http://localhost:3000/ws/status | jq '.'
```

## Expected Results

### After Creating 3 Orders + 2 Stop-Losses:

Database should show:
- 1 user created
- 3 orders (status: filled in paper trading)
- 2 stop-losses (status: active)
- 0-3 transactions (if orders executed)

Summary should show:
```json
{
  "totalOrders": 3,
  "openOrders": 0,
  "activeStopLosses": 2,
  "totalFees": "0",
  "builderFees": "0",
  "profitLoss": "0"
}
```

---

**Ready to test Phase 3? Run `./test_phase3.sh`! 🔨**
