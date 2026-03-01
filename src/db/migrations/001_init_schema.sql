-- Phase 3 Initial Schema Migration
-- Safe PostgreSQL schema setup for PolyGuard
-- Run this on Supabase to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE order_status AS ENUM (
  'pending',
  'open',
  'filled',
  'partial_fill',
  'cancelled',
  'failed'
);

CREATE TYPE stop_loss_status AS ENUM (
  'active',
  'triggered',
  'cancelled',
  'executed'
);

CREATE TYPE order_side AS ENUM ('buy', 'sell');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  auth_token VARCHAR(255),
  nonce VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_idx ON users(wallet_address);
CREATE INDEX IF NOT EXISTS auth_token_idx ON users(auth_token);

-- Stop Losses Table
CREATE TABLE IF NOT EXISTS stop_losses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id VARCHAR(255) NOT NULL,
  market_id VARCHAR(255) NOT NULL,
  trigger_price DECIMAL(18, 8) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  status stop_loss_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  triggered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS stop_loss_user_idx ON stop_losses(user_id);
CREATE INDEX IF NOT EXISTS stop_loss_status_idx ON stop_losses(status);
CREATE INDEX IF NOT EXISTS stop_loss_market_idx ON stop_losses(market_id);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id VARCHAR(255) NOT NULL,
  market_id VARCHAR(255) NOT NULL,
  side order_side NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8),
  status order_status NOT NULL DEFAULT 'pending',
  p_and_l DECIMAL(18, 8),
  clob_order_id VARCHAR(255),
  paper_trade BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  executed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS order_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS order_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS order_market_idx ON orders(market_id);
CREATE UNIQUE INDEX IF NOT EXISTS clob_order_idx ON orders(clob_order_id);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_hash VARCHAR(255),
  builder_code VARCHAR(255),
  builder_fee DECIMAL(18, 8),
  total_fee DECIMAL(18, 8),
  profit_loss DECIMAL(18, 8),
  notes TEXT,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS transaction_order_idx ON transactions(order_id);
CREATE INDEX IF NOT EXISTS transaction_user_idx ON transactions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tx_hash_idx ON transactions(tx_hash);

-- Price History Table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id VARCHAR(255) NOT NULL,
  bid DECIMAL(18, 8),
  ask DECIMAL(18, 8),
  last_price DECIMAL(18, 8),
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS price_market_idx ON price_history(market_id);
CREATE INDEX IF NOT EXISTS price_timestamp_idx ON price_history(timestamp);

-- Grant appropriate permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create audit timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
