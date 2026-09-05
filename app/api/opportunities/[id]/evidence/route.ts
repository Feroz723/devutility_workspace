import { NextRequest, NextResponse } from "next/server";
import { getEvidenceByOpportunityId } from "@/database/repositories/research-repo";

export const dynamic = "force-dynamic";

/**
 * GET /api/opportunities/:id/evidence
 * Lists all research evidence items linked to an opportunity.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evidence = await getEvidenceByOpportunityId(params.id);
    return NextResponse.json({ evidence });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
