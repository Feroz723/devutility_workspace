import { NextResponse } from "next/server";
import { queryOne } from "@/database/client";
import { runtimeWorker } from "@/runtime/worker";
import { runtimeScheduler } from "@/runtime/scheduler";

export async function GET() {
  try {
    const dbPing = await queryOne("SELECT 1 as ping").catch(() => null);
    const isDbHealthy = Boolean(dbPing);

    return NextResponse.json({
      status: isDbHealthy ? "HEALTHY" : "DEGRADED",
      database: isDbHealthy ? "CONNECTED" : "UNREACHABLE",
      worker: runtimeWorker.isWorkerRunning() ? "RUNNING" : "STOPPED",
      scheduler: runtimeScheduler.isSchedulerRunning() ? "RUNNING" : "STOPPED",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "UNHEALTHY", error: err.message, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
