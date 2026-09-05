import { NextRequest, NextResponse } from "next/server";
import { getResearchRunById } from "@/database/repositories/research-repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/research/runs/:id
 * Retrieve details for a specific research run.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const run = await getResearchRunById(params.id);
    if (!run) {
      return NextResponse.json({ error: "Research run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] GET /api/research/runs/:id error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
