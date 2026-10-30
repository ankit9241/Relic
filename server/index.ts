import { createApp } from "./app";
import { CONFIG } from "./config";
import { excavationStore } from "./storage";

async function main() {
  await excavationStore.init();

  const app = createApp();

  const server = app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`RELIC Analysis Service listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`Health check: http://${CONFIG.HOST}:${CONFIG.PORT}/api/health`);
  });

  const shutdown = async () => {
    console.log("\nShutting down RELIC Analysis Service...");
    server.close();
    await excavationStore.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.env["NODE_ENV"] !== "test") {
  main().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}
