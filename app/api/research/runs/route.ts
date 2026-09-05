import { NextRequest, NextResponse } from "next/server";
import { listResearchRuns } from "@/database/repositories/research-repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/research/runs
 * Lists historical research runs with summary metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const runs = await listResearchRuns(limit);
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] GET /api/research/runs error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
