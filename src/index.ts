import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config";
import authRoutes from "./auth/routes";
import signingRoutes from "./signing/routes";
import phase4Routes from "./trading/phase4-routes";
import wsHandler from "./ws/handler";
import extensionHandler from "./ws/extension-handler";

const app = new Hono();

// Middleware
app.use(logger());
app.use(
  cors({
    origin: [config.extensionOrigin, "http://localhost:3000", "http://localhost:*"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.4.0", // Phase 4
    phase: "4-real-execution",
  });
});

// Routes
app.route("/auth", authRoutes);
app.route("/signing", signingRoutes);
app.route("/trading", phase4Routes);

// WebSocket endpoints
app.get("/ws/prices", wsHandler); // Polymarket price monitoring
app.get("/ws/extension", extensionHandler); // Chrome extension real-time updates

// Phase 4 status endpoint
app.get("/status/phase4", (c) => {
  const { getPhase4Executor } = require("./trading/phase4-executor");
  const executor = getPhase4Executor();
  
  return c.json({
    phase: 4,
    status: "active",
    executor: executor.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    { error: "Not found", path: c.req.path },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      error: err.message || "Internal server error",
      timestamp: new Date().toISOString(),
    },
    500
  );
});

// Start server
const port = config.port || 3000;
console.log(`🚀 PolyGuard Backend - Phase 4 starting on port ${port}`);
console.log(`📍 Environment: ${config.nodeEnv}`);
console.log(`🎯 PAPER_TRADING: ${config.paperTrading}`);
console.log(`📡 WebSocket /ws/prices (Polymarket price feed)`);
console.log(`📱 WebSocket /ws/extension (Chrome extension updates)`);

export default app;
