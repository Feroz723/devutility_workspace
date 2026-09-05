import { NextResponse } from "next/server";
import { checkDbHealth } from "@/database/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbHealth = await checkDbHealth();
    const healthy = dbHealth.status === "CONNECTED";
    return NextResponse.json(
      {
        status: healthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        database: dbHealth,
        version: "0.2.0",
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: { status: "ERROR", reason: "Health check failed" },
      },
      { status: 503 }
    );
  }
}
