import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  // Database (Supabase PostgreSQL)
  postgresUrl: process.env.POSTGRES_URL || "",
  databaseEnabled: !!process.env.POSTGRES_URL,

  // Polymarket APIs
  polymarketClibUrl:
    process.env.POLYMARKET_CLOB_URL || "https://clob.polymarket.com",
  polymarketWsUrl:
    process.env.POLYMARKET_WS_URL ||
    "wss://ws-subscriptions-clob.polymarket.com/ws/market",

  // Builder Code & Signing (for real Polymarket integration)
  builderCode: process.env.BUILDER_CODE || "",
  builderSecretKey: process.env.BUILDER_SECRET_KEY || "",
  builderPassphrase: process.env.BUILDER_PASSPHRASE || "",

  // SIWE (Sign-In-With-Ethereum)
  siweDomain: process.env.SIWE_DOMAIN || "localhost",
  siweUri: process.env.SIWE_URI || "http://localhost:3000",

  // Extension origin (for CORS)
  extensionOrigin: process.env.EXTENSION_ORIGIN || "chrome-extension://",

  // Paper trading mode (no actual trades executed)
  paperTrading: process.env.PAPER_TRADING !== "false",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
};

// Validate required config
const requiredConfig = ["builderCode", "builderSecretKey"];
for (const key of requiredConfig) {
  if (!config[key as keyof typeof config]) {
    console.warn(`⚠️ Missing config: ${key}`);
  }
}

// Warn if database not configured
if (!config.databaseEnabled) {
  console.warn("⚠️ POSTGRES_URL not set - database features disabled");
  console.warn("   Phase 3 requires: POSTGRES_URL from Supabase");
}

export default config;
