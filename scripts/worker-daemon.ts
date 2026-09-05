/**
 * Standalone Autonomous Worker Daemon
 * Run with: npm run worker
 */
import { runtimeManager } from "@/runtime/runtime-manager";
import { runtimeWorker } from "@/runtime/worker";
import { runtimeScheduler } from "@/runtime/scheduler";

async function main() {
  console.log("==================================================");
  console.log("Starting Autonomous Business OS Worker Daemon...");
  console.log("==================================================");

  await runtimeManager.boot();

  console.log(`[Worker] Worker started. Instance ID: ${runtimeWorker.getInstanceId()}`);
  console.log(`[Scheduler] Scheduler started. Polling due schedules.`);
  console.log("[Runtime] Autonomous business loop active. Listening for work...");

  const shutdown = async (signal: string) => {
    console.log(`\n[Runtime] Received ${signal}. Gracefully shutting down...`);
    await runtimeManager.shutdown();
    console.log("[Runtime] Daemon stopped cleanly.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[Runtime] Fatal daemon error:", err);
  process.exit(1);
});
