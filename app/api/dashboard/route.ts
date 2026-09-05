import { NextResponse } from "next/server";
import { getDashboardStats } from "@/database/repositories/dashboard-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // If DB is not connected, return zeros
    if (message.includes("DATABASE_URL") || message.includes("Connection")) {
      return NextResponse.json({
        opportunities: { total: 0, validated: 0, testing: 0, winners: 0 },
        experiments: { active: 0, completed: 0, failed: 0 },
        products: { launched: 0 },
        business: { traffic: 0, conversions: 0, revenue: 0 },
        approvals: { pending: 0 },
        automation: { connected: 0, running: 0, failed: 0 },
        _db_status: "NOT_CONNECTED",
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
