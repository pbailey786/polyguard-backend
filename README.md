# PolyGuard Backend - Phase 2

Trade execution + builder code revenue for Polymarket.

## Phase 2 Status

- ✅ Backend scaffold (Hono.js + TypeScript)
- ✅ SIWE authentication endpoints
- ✅ Builder code signing endpoints
- ✅ CLOB client integration (framework)
- ✅ Order execution endpoints (FOK sell orders)
- ✅ WebSocket price monitoring (framework)
- ⏳ Real Polymarket CLOB API integration
- ⏳ Extension ↔ Backend communication
- ⏳ Web Push API integration
- ⏳ Landing page for Chrome Web Store

## Quick Start

### 1. Install Dependencies

```bash
cd /root/.openclaw/workspace/polyguard-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Polymarket builder code and secret:

```
BUILDER_CODE=your_builder_code
BUILDER_SECRET_KEY=your_secret_key
PORT=3000
```

### 3. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 4. Test Endpoints

#### Get Nonce for SIWE

```bash
curl http://localhost:3000/auth/nonce
```

Response:

```json
{
  "success": true,
  "data": {
    "nonce": "abc123def456",
    "message": "Use this nonce to sign in with Ethereum"
  },
  "timestamp": "2026-03-01T03:00:00Z"
}
```

#### Create SIWE Message

```bash
curl -X POST http://localhost:3000/auth/message \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123...", "nonce": "abc123def456"}'
```

#### Verify Signature & Create Session

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"message": "...", "signature": "0x..."}'
```

#### Execute Order

```bash
curl -X POST http://localhost:3000/trading/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x123...",
    "side": "sell",
    "amount": 100,
    "price": 0.50
  }'
```

#### Execute Stop-Loss Order

```bash
curl -X POST http://localhost:3000/trading/stop-loss \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x123...",
    "amount": 100,
    "price": 0.40
  }'
```

#### Sign Order for Builder Attribution

```bash
curl -X POST http://localhost:3000/signing/builder-sign \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_123",
    "marketId": "0x123...",
    "amount": 100,
    "price": 0.50
  }'
```

## Architecture

### Routes

- **`/auth`** - SIWE authentication
  - `GET /nonce` - Generate nonce
  - `POST /message` - Create SIWE message
  - `POST /verify` - Verify signature & create session
  - `GET /verify-session` - Check session validity
  - `POST /logout` - Invalidate session

- **`/signing`** - Builder code signing
  - `POST /builder-sign` - Sign single order
  - `POST /batch-sign` - Sign multiple orders

- **`/trading`** - Order execution
  - `POST /execute` - Place order
  - `POST /stop-loss` - Execute stop-loss sell
  - `GET /orders` - List open orders
  - `GET /orders/:orderId` - Get order status
  - `POST /orders/:orderId/cancel` - Cancel order

- **`/ws/prices`** - WebSocket price updates

### Key Files

```
src/
├── index.ts              # Main Hono server
├── config.ts             # Environment config
├── types.ts              # TypeScript types
├── auth/
│   ├── siwe.ts          # SIWE message creation & verification
│   └── routes.ts        # Auth endpoints
├── signing/
│   ├── builder.ts       # Builder code signing logic
│   └── routes.ts        # Signing endpoints
├── trading/
│   ├── clob-client.ts   # CLOB API wrapper
│   └── routes.ts        # Trading endpoints
└── ws/
    └── handler.ts       # WebSocket price monitoring
```

## Paper Trading Mode

By default, the backend runs in **PAPER_TRADING** mode (`PAPER_TRADING=true`).

This means:
- Orders are simulated, not executed on-chain
- No real trades or funds involved
- Perfect for testing the framework

To enable real trading (not recommended without thorough testing):

```
PAPER_TRADING=false
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `POLYMARKET_CLOB_URL` | No | https://clob.polymarket.com | CLOB API URL |
| `POLYMARKET_WS_URL` | No | wss://ws-subscriptions-clob.polymarket.com/ws/market | WebSocket URL |
| `BUILDER_CODE` | Yes | - | Your Polymarket builder code |
| `BUILDER_SECRET_KEY` | Yes | - | Your builder secret key |
| `SIWE_DOMAIN` | No | localhost | SIWE domain |
| `SIWE_URI` | No | http://localhost:3000 | SIWE URI |
| `EXTENSION_ORIGIN` | No | chrome-extension:// | Extension CORS origin |
| `PAPER_TRADING` | No | true | Enable paper trading mode |
| `LOG_LEVEL` | No | info | Logging level |

## Builder Code Registration

To get your builder code:

1. Visit https://polymarket.com/settings?tab=builder
2. Register as a builder
3. Generate your builder code and secret key
4. Add to `.env`:
   ```
   BUILDER_CODE=your_code
   BUILDER_SECRET_KEY=your_secret
   ```

Each order placed through your builder code will credit you with a small fee on Polymarket. This is how PolyGuard monetizes while keeping user control.

## Next Steps (TODO)

1. **Real CLOB API Integration**
   - Replace mock orders with actual CLOB client calls
   - Integrate @polymarket/clob-client SDK
   - Add real authentication flow

2. **Extension Communication**
   - Set up message passing between extension and backend
   - Handle cross-origin requests properly
   - Sync stop-loss orders

3. **Web Push Notifications**
   - Integrate Web Push API
   - Send notifications when orders execute
   - Track portfolio changes

4. **Price Monitoring**
   - Connect real WebSocket to Polymarket
   - Monitor stop-loss triggers
   - Auto-execute sell orders

5. **Deployment**
   - Deploy to Fly.io or Railway
   - Set up proper SSL/TLS
   - Configure production env vars

6. **Landing Page**
   - Create Chrome Web Store landing page
   - Add installation instructions
   - Explain builder code revenue model

## Known Limitations

- WebSocket uses mock data (needs real Polymarket integration)
- Order execution is paper trading only
- Session storage is in-memory (needs Redis for production)
- No database (needs to persist orders, users, etc.)

## Testing

```bash
# Type check
npm run type-check

# Build
npm run build

# Start production server
npm run start
```

## Deployment

### Fly.io

```bash
flyctl launch
flyctl deploy
```

### Railway

```bash
railway link
railway up
```

## Monitoring

Check WebSocket connections:

```bash
curl http://localhost:3000/health
```

## Support

For issues with Polymarket APIs:
- Docs: https://docs.polymarket.com/developers/CLOB/authentication
- Discord: Polymarket community
- GitHub: https://github.com/polymarket

## License

MIT
