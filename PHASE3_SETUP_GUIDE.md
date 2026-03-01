# Phase 3 Setup Guide

## Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd /root/.openclaw/workspace/polyguard-backend
npm install
```

### Step 2: Configure Environment

Copy and fill in:
```bash
cp .env.example .env
```

Key variables to set:
```env
# From Paul (Supabase)
POSTGRES_URL=postgresql://user:password@host:port/database

# From Paul (Polymarket Builder)
BUILDER_CODE=your_builder_code
BUILDER_SECRET_KEY=your_secret_key
BUILDER_PASSPHRASE=your_passphrase

# For testing
PAPER_TRADING=true
```

### Step 3: Initialize Database

1. **Get Supabase Connection String**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Settings → Database → Connection string
   - Copy the `postgresql://` URL
   - Paste into `.env` as `POSTGRES_URL`

2. **Run Migrations**
   - Open Supabase SQL editor
   - Copy entire content from `src/db/migrations/001_init_schema.sql`
   - Paste into SQL editor and execute

3. **Verify Connection**
   ```bash
   npm run type-check
   ```

### Step 4: Start Server
```bash
npm run dev
```

Should see:
```
✅ Database connection established
🔌 Price Monitor initialized
🚀 Server running on http://localhost:3000
```

### Step 5: Test Basic Operations
```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/db/users \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x0000000000000000000000000000000000000001"}'
```

## Detailed Setup

### Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Git
- Supabase free account (https://supabase.com)

### Installation

```bash
# Clone/navigate to repo
cd /root/.openclaw/workspace/polyguard-backend

# Install dependencies
npm install

# Verify TypeScript
npm run type-check
```

### Configuration

#### 1. Database Setup

**Create Supabase Project**
1. Go to https://supabase.com → New Project
2. Fill in project details (or use existing)
3. Wait for project to initialize (~2 minutes)

**Get Connection String**
1. Go to Settings → Database → Connection Pooling
2. Copy connection string (change password if needed)
3. Copy to `.env`:
   ```env
   POSTGRES_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

**Run Migrations**
1. Go to SQL Editor in Supabase
2. Click "New Query"
3. Copy entire `src/db/migrations/001_init_schema.sql`
4. Paste and click "Run"
5. Should see "Schema created successfully"

**Verify Tables**
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Should show: users, orders, stop_losses, transactions, price_history

#### 2. Polymarket Configuration

Get from Paul:
```env
# Builder Code for attribution
BUILDER_CODE=your_code_here

# Secret key for signing
BUILDER_SECRET_KEY=your_secret_here

# Passphrase for encryption
BUILDER_PASSPHRASE=your_passphrase_here
```

#### 3. Testing Configuration

For safe testing:
```env
# Use paper trading (simulated, no real funds)
PAPER_TRADING=true

# Optional: detailed logging
LOG_LEVEL=debug
```

### Running the Server

**Development (with hot reload)**
```bash
npm run dev
```

**Production**
```bash
npm run build
npm start
```

**Type checking**
```bash
npm run type-check
```

### Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install` succeeded)
- [ ] `.env` file created with POSTGRES_URL
- [ ] Supabase migrations run successfully
- [ ] `npm run type-check` passes
- [ ] Server starts with `npm run dev`
- [ ] Health check responds: `curl http://localhost:3000/health`

## Testing Phase 3 Features

### Test 1: Database Connection

```bash
# Check database health
curl http://localhost:3000/db/health

# Expected response:
{
  "healthy": true,
  "connection": "ok"
}
```

### Test 2: Create User

```bash
# Create a test user
curl -X POST http://localhost:3000/db/users \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef",
    "nonce": "test_nonce_123"
  }'

# Save the returned user ID for next tests
# Response includes: id, walletAddress, createdAt
```

### Test 3: Create Order

```bash
# Create an order (paper trading)
curl -X POST http://localhost:3000/trading/orders \
  -H "Authorization: Bearer <token_from_auth>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
    "side": "sell",
    "amount": 100,
    "price": 0.50
  }'

# Returns: orderId, status (should be "pending")
```

### Test 4: Create Stop-Loss

```bash
# Create a stop-loss order
curl -X POST http://localhost:3000/trading/stop-losses \
  -H "Authorization: Bearer <token_from_auth>" \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
    "triggerPrice": 0.40,
    "quantity": 100
  }'

# Returns: stopLossId, status (should be "active")
```

### Test 5: Monitor Prices

```bash
# Check WebSocket status
curl http://localhost:3000/ws/status

# Expected: shows subscriptions and cached prices
```

## Troubleshooting

### Issue: Database Connection Failed

**Error**: `❌ Database connection failed`

**Solutions**:
1. Check `POSTGRES_URL` is set in `.env`
2. Test connection string directly:
   ```bash
   psql "postgresql://user:password@host/db"
   ```
3. Verify Supabase database is running
4. Check firewall allows PostgreSQL port 5432

### Issue: Tables Not Found

**Error**: `relation "users" does not exist`

**Solutions**:
1. Run migrations again in Supabase SQL editor
2. Verify migrations executed without errors
3. Check tables exist:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### Issue: WebSocket Connection Failed

**Error**: `❌ WebSocket connection error`

**Solutions**:
1. Check Polymarket API is accessible:
   ```bash
   curl https://clob.polymarket.com/ping
   ```
2. Verify WebSocket URL in config (should be wss://)
3. Check firewall allows WebSocket connections

### Issue: Builder Code Invalid

**Error**: `⚠️ Missing config: builderCode`

**Solutions**:
1. Get builder code from Paul
2. Set in `.env`:
   ```env
   BUILDER_CODE=your_code
   BUILDER_SECRET_KEY=your_secret
   BUILDER_PASSPHRASE=your_passphrase
   ```
3. For testing, can use dummy values in PAPER_TRADING mode

### Issue: TypeScript Compilation Error

**Error**: `TSError: ⨯ TypeError: Cannot find module`

**Solutions**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
npm run type-check -- --noEmit
```

## Development Workflow

### Making Changes

1. Edit TypeScript files in `src/`
2. Server auto-reloads with `npm run dev`
3. Check for errors in terminal
4. Test with curl or Postman

### Adding Database Operations

1. Create service in `src/db/services/`
2. Update schema in `src/db/schema.ts` if needed
3. Use in routes or business logic
4. Test with curl

### Adding API Endpoints

1. Create route handler in `src/trading/routes.ts` or similar
2. Use database services for operations
3. Return `ApiResponse` wrapper
4. Test with curl

## Database Maintenance

### Backup

```sql
-- In Supabase dashboard, use built-in backups
-- Settings → Backups → Create backup
```

### View Data

```sql
-- In Supabase SQL editor
SELECT * FROM users LIMIT 10;
SELECT * FROM orders WHERE status = 'open';
SELECT * FROM stop_losses WHERE status = 'active';
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;
```

### Reset Database (Caution!)

```sql
-- Drop all tables (WARNING: Deletes all data!)
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS stop_losses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Then re-run migrations
```

## Deployment

### Local Testing Complete?
✅ Server starts without errors  
✅ Database connects  
✅ Can create users and orders  
✅ Paper trading works  

### Deploy to Production

**Option 1: Fly.io**
```bash
flyctl launch
# Follow prompts
flyctl deploy
```

**Option 2: Railway**
```bash
railway link
railway up
```

**Option 3: Heroku**
```bash
heroku create polyguard-backend
git push heroku main
```

### Production Environment Variables

Add to deployment platform:
```env
NODE_ENV=production
POSTGRES_URL=<supabase-prod-url>
BUILDER_CODE=<real-builder-code>
BUILDER_SECRET_KEY=<real-secret>
BUILDER_PASSPHRASE=<real-passphrase>
PAPER_TRADING=false  # Only after thorough testing!
PORT=3000
```

## Performance Optimization

### Database
- Indexes on frequently queried columns ✅ (already in schema)
- Connection pooling ✅ (configured)
- Query timeouts ✅ (30s default)

### WebSocket
- Subscription filtering (only subscribed markets)
- Exponential backoff on reconnect
- Price caching to reduce lookups

### API
- Response compression (Hono default)
- JSON caching headers
- Rate limiting (TODO)

## Next Steps

1. **Get Credentials from Paul**
   - Supabase connection string
   - Polymarket Builder credentials

2. **Complete Setup**
   - Configure database
   - Run migrations
   - Test paper trading

3. **Enable Real Trading** (after thorough testing)
   - Set PAPER_TRADING=false
   - Use real builder credentials
   - Monitor closely

4. **Monitor in Production**
   - Set up logging
   - Monitor database performance
   - Track API latency

## Support

For issues:
1. Check troubleshooting section above
2. Review logs: `npm run dev` with LOG_LEVEL=debug
3. Check database directly in Supabase
4. Contact Paul with error details

---

**Ready to build Phase 3? Let's go! 🔨**
