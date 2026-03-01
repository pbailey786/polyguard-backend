# 🔑 Credentials Guide for Phase 3

What you need to provide to activate real trading.

## Quick Reference

| Variable | Source | What It Is | Status |
|----------|--------|-----------|--------|
| `POSTGRES_URL` | Supabase | Database connection | ⏳ NEEDED |
| `BUILDER_CODE` | Polymarket | Builder attribution ID | ⏳ NEEDED |
| `BUILDER_SECRET_KEY` | Polymarket | API secret | ⏳ NEEDED |
| `BUILDER_PASSPHRASE` | Polymarket | Encryption key | ⏳ NEEDED |

## 1. Supabase Database Connection

### Get It:
1. Go to https://supabase.com/dashboard
2. Select your project (or create new one)
3. Click **Settings** (bottom left)
4. Click **Database**
5. Copy **Connection string** (showing `postgresql://...`)
6. Scroll right to see **[SHOW PASSWORD]** button
7. Click it and enter your Supabase password
8. Copy the full connection string

### It Looks Like:
```
postgresql://postgres:YOUR_PASSWORD@db.XXXX.supabase.co:5432/postgres
```

### Where to Put It:
```bash
# In .env file:
POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.XXXX.supabase.co:5432/postgres
```

### What It Does:
- Connects to PostgreSQL database
- Stores all users, orders, stop-losses, transactions
- Enables order persistence and P&L tracking

---

## 2. Polymarket Builder Code

### Get It:
1. Go to https://polymarket.com/settings
2. Click **Builder** tab
3. If not registered as builder:
   - Click **Register as Builder**
   - Accept terms
4. Click **Generate Builder Code**
5. You'll get 3 things:
   - **Builder Code** (looks like: `pg_abc123def456`)
   - **Secret Key** (looks like: `sk_test_ABC123...`)
   - **Passphrase** (something you set)

### Example Values:
```
Builder Code: pg_live_123456789abc
Secret Key: sk_live_abcdef1234567890
Passphrase: MySecurePassphrase123!
```

### Where to Put Them:
```bash
# In .env file:
BUILDER_CODE=pg_live_123456789abc
BUILDER_SECRET_KEY=sk_live_abcdef1234567890
BUILDER_PASSPHRASE=MySecurePassphrase123!
```

### What It Does:
- Identifies your builder on Polymarket
- Signs orders for execution
- Earns revenue share on trades
- Powers the automation engine

---

## Full Setup Steps

### Step 1: Get Supabase
```bash
# 1. Visit https://supabase.com
# 2. Click "Start your project"
# 3. Sign in with GitHub
# 4. Create new project (name: "polyguard")
# 5. Choose region closest to you
# 6. Save password (needed for connection string)
# 7. Wait 2-3 minutes for setup
```

### Step 2: Get Connection String
```bash
# 1. In Supabase dashboard, click Settings
# 2. Click Database
# 3. Under "Connection string", click "Connection pooling"
# 4. Change Mode to "Transaction" (default is Session)
# 5. Click "Copy connection string"
# 6. Paste into .env as POSTGRES_URL
```

### Step 3: Get Polymarket Builder Code
```bash
# 1. Visit https://polymarket.com/settings?tab=builder
# 2. Click "Register as Builder" if needed
# 3. Click "Create Builder Code"
# 4. Choose name: "PolyGuard"
# 5. You'll receive:
#    - Builder Code
#    - Secret Key
#    - Passphrase (you set this)
# 6. Copy all three to .env
```

### Step 4: Update .env File
```bash
# Open .env
nano /root/.openclaw/workspace/polyguard-backend/.env

# Fill in:
POSTGRES_URL=<from Supabase>
BUILDER_CODE=<from Polymarket>
BUILDER_SECRET_KEY=<from Polymarket>
BUILDER_PASSPHRASE=<from Polymarket>

# Save and exit
```

### Step 5: Verify
```bash
# Make sure all are set
grep -E "POSTGRES_URL|BUILDER_CODE|BUILDER_SECRET_KEY|BUILDER_PASSPHRASE" .env
# Should show all 4 variables with values (not empty)
```

---

## Supabase Connection String Details

### Format:
```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

### Parts:
- **USERNAME**: Usually `postgres` (default)
- **PASSWORD**: The one you set during project creation
- **HOST**: Something like `db.xxxxxxxxxxxxx.supabase.co`
- **PORT**: Usually `5432` (standard PostgreSQL)
- **DATABASE**: Usually `postgres` (default)

### Test Connection:
```bash
# If you have psql installed:
psql "postgresql://user:pass@host:5432/postgres"

# If successful, you'll see:
postgres=>
```

---

## Polymarket Builder Code Details

### Where It Goes:
1. **BUILDER_CODE** - Identifies your builder (for attribution)
2. **BUILDER_SECRET_KEY** - Signs API requests
3. **BUILDER_PASSPHRASE** - Encrypts sensitive data

### Security Notes:
- **NEVER commit `.env` to Git** (already in .gitignore ✅)
- **Don't share these values** (they control real orders)
- **Rotate keys regularly** in production
- **Use environment variables** for deployment

### Production Setup:
For Fly.io/Railway/Heroku, set as secrets:
```bash
# Fly.io
flyctl secrets set POSTGRES_URL="postgresql://..."
flyctl secrets set BUILDER_CODE="pg_live_..."
flyctl secrets set BUILDER_SECRET_KEY="sk_live_..."
flyctl secrets set BUILDER_PASSPHRASE="..."

# Railway
railway variables set POSTGRES_URL="postgresql://..."
# ... repeat for others

# Heroku
heroku config:set POSTGRES_URL="postgresql://..."
# ... repeat for others
```

---

## Verification Checklist

- [ ] Supabase project created
- [ ] Database initialized
- [ ] Connection string copied to `.env` as `POSTGRES_URL`
- [ ] Polymarket builder code created
- [ ] Builder code copied to `.env` as `BUILDER_CODE`
- [ ] Secret key copied to `.env` as `BUILDER_SECRET_KEY`
- [ ] Passphrase copied to `.env` as `BUILDER_PASSPHRASE`
- [ ] `.env` file is in `.gitignore` (don't commit!)
- [ ] All 4 variables in `.env` have values (not empty)

---

## Testing Credentials

### Quick Test:
```bash
# With credentials in .env, run:
npm run dev

# Should see:
✅ Database connection established
✅ Builder code configured
🚀 Server running on http://localhost:3000
```

### If It Fails:

**Database error:**
```
❌ Database connection failed
→ Check POSTGRES_URL is correct
→ Verify Supabase password
→ Test with: psql "postgresql://..."
```

**Builder code error:**
```
⚠️ Missing config: builderCode
→ Check BUILDER_CODE is set in .env
→ Check BUILDER_SECRET_KEY is set
→ Check BUILDER_PASSPHRASE is set
```

---

## Never Commit Credentials!

### Good (Already Set Up ✅):
```bash
# .gitignore includes:
.env
.env.local
.env.*.local
```

### Verify:
```bash
# Check .env is ignored:
git status | grep ".env"
# Should show nothing

# Double check:
cat .gitignore | grep ".env"
# Should show .env* patterns
```

---

## Troubleshooting

### "Connection refused"
- Supabase project not started
- Wait 2-3 minutes after creation
- Check region (should be close to you)

### "Invalid password"
- Password case-sensitive
- Try copy-pasting again
- Reset password in Supabase settings

### "Unknown username"
- Make sure using `postgres` (default)
- Check if you created custom user (would need different name)

### "Builder code invalid"
- Double-check spelling
- Copy-paste from Polymarket again
- Verify prefix is `pg_` or `sk_`

---

## Support

Stuck getting credentials?

1. **Supabase Help**: https://supabase.com/docs
2. **Polymarket Help**: https://docs.polymarket.com/developers/CLOB/authentication
3. **Common Issues**: See troubleshooting above

---

## Timeline

| Task | Time | Status |
|------|------|--------|
| Create Supabase account | 2 min | 🟡 You |
| Get connection string | 1 min | 🟡 You |
| Create Polymarket builder | 3 min | 🟡 You |
| Update .env | 1 min | 🟡 You |
| Test connection | 1 min | 🟡 You |
| **Total** | **8 min** | 🟡 You |

---

## Once Credentials Are Set

1. ✅ Database will persist all orders
2. ✅ Real orders can execute on Polymarket
3. ✅ Stop-losses will trigger automatically
4. ✅ Revenue tracking is active
5. ✅ Ready for production deployment

---

**Ready to provide credentials? Follow the steps above! 🔑**

For questions: See `PHASE3_SETUP_GUIDE.md` or `PHASE3_DOCUMENTATION.md`
