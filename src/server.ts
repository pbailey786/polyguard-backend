/**
 * Server startup entry point for Node.js
 * Run with: tsx src/server.ts or node dist/server.js
 */

import { serve } from "@hono/node-server";
import app from "./index";
import { config } from "./config";

const port = config.port || 3000;

console.log(`🚀 PolyGuard Backend starting on port ${port}`);
console.log(`📍 Environment: ${config.nodeEnv}`);
console.log(`🎯 PAPER_TRADING: ${config.paperTrading}`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Server listening on http://localhost:${info.port}`);
    console.log(`📊 Health: http://localhost:${info.port}/health`);
    console.log(`🔐 Auth: http://localhost:${info.port}/auth/nonce`);
  }
);
